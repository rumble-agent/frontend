import type { StreamEvent } from "./types";
import { emit } from "./agent";

/* ─── Rumble Live Stream API Poller ─── */

/**
 * Polls the Rumble Live Stream API (v1.1) and converts raw events
 * into StreamEvent objects for the agent to evaluate.
 *
 * API docs: rumble.com/account/livestream-api
 * Each user has a unique JSON endpoint URL. No OAuth — URL itself is the auth.
 * Data is only populated during a live stream.
 */

const RUMBLE_API_URL = process.env.RUMBLE_API_URL ?? "";
const POLL_INTERVAL_MS = Number(process.env.RUMBLE_POLL_INTERVAL ?? "8000"); // 8s default

/* ─── Snapshot State (for diffing) ─── */
interface RumbleSnapshot {
  watching_now: number;
  num_followers: number;
  num_subscribers: number;
  latest_rant_text: string | null;
  latest_subscriber: string | null;
  latest_follower: string | null;
  chat_count: number;
}

let lastSnapshot: RumbleSnapshot | null = null;

/* ─── Poller State ─── */
type EventCallback = (event: StreamEvent) => void;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let callbacks: EventCallback[] = [];
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

export function isRumbleConfigured(): boolean {
  return !!RUMBLE_API_URL && RUMBLE_API_URL.includes("rumble.com");
}

export function getRumbleStatus(): { configured: boolean; polling: boolean; url_set: boolean } {
  return {
    configured: isRumbleConfigured(),
    polling: isPolling,
    url_set: !!RUMBLE_API_URL,
  };
}

/* ─── Parse Rumble API Response → StreamEvents ─── */
function diffAndEmitEvents(data: Record<string, unknown>): StreamEvent[] {
  const events: StreamEvent[] = [];
  const now = Date.now();

  // Extract fields from Rumble API response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livestreams = (data.livestreams as any[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followers = data.followers as Record<string, any> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribers = data.subscribers as Record<string, any> | undefined;

  const currentStream = livestreams[0];

  const currentSnapshot: RumbleSnapshot = {
    watching_now: currentStream?.watching_now ?? 0,
    num_followers: followers?.num_followers ?? 0,
    num_subscribers: subscribers?.num_subscribers ?? 0,
    latest_rant_text: currentStream?.chat?.latest_rant?.text ?? null,
    latest_subscriber: subscribers?.latest_subscriber?.username ?? null,
    latest_follower: followers?.latest_follower?.username ?? null,
    chat_count: currentStream?.chat?.recent_messages?.length ?? 0,
  };

  if (lastSnapshot) {
    // 1. Viewer spike detection
    const prevViewers = lastSnapshot.watching_now;
    const currViewers = currentSnapshot.watching_now;
    if (prevViewers > 0 && currViewers > prevViewers * 1.3) {
      // 30%+ increase
      events.push({
        type: "viewer_spike",
        timestamp: now,
        data: {
          viewer_count: currViewers,
          previous_viewer_count: prevViewers,
          sentiment: "positive",
          sentiment_score: Math.min(currViewers / prevViewers / 5, 1),
        },
      });
    }

    // 2. New subscriber
    if (
      currentSnapshot.latest_subscriber &&
      currentSnapshot.latest_subscriber !== lastSnapshot.latest_subscriber
    ) {
      events.push({
        type: "new_subscriber",
        timestamp: now,
        data: {
          subscriber_id: currentSnapshot.latest_subscriber,
          sentiment: "positive",
          sentiment_score: 0.72,
        },
      });
    }

    // 3. Rant (paid message = donation)
    if (
      currentSnapshot.latest_rant_text &&
      currentSnapshot.latest_rant_text !== lastSnapshot.latest_rant_text
    ) {
      // Extract rant amount if available
      const rantData = currentStream?.chat?.latest_rant;
      const amountDollars = rantData?.amount_dollars ?? 0;
      events.push({
        type: "donation",
        timestamp: now,
        data: {
          sentiment: "positive",
          sentiment_score: Math.min(0.6 + amountDollars / 100, 1),
        },
      });
    }

    // 4. New follower → milestone check
    if (
      currentSnapshot.num_followers > lastSnapshot.num_followers
    ) {
      const newFollowerCount = currentSnapshot.num_followers;
      // Check for round-number milestones
      const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
      const crossedMilestone = milestones.find(
        (m) => lastSnapshot!.num_followers < m && newFollowerCount >= m
      );

      if (crossedMilestone) {
        events.push({
          type: "milestone",
          timestamp: now,
          data: {
            milestone_type: `${crossedMilestone >= 1000 ? `${crossedMilestone / 1000}k` : crossedMilestone}_followers`,
            sentiment: "positive",
            sentiment_score: 0.95,
          },
        });
      }
    }

    // 5. Chat activity spike (sentiment proxy)
    if (
      lastSnapshot.chat_count > 0 &&
      currentSnapshot.chat_count > lastSnapshot.chat_count * 1.5
    ) {
      events.push({
        type: "sentiment_shift",
        timestamp: now,
        data: {
          sentiment: "positive",
          sentiment_score: 0.78,
        },
      });
    }
  }

  lastSnapshot = currentSnapshot;
  return events;
}

/* ─── Poll Once ─── */
async function pollOnce(): Promise<StreamEvent[]> {
  if (!RUMBLE_API_URL) return [];

  try {
    const res = await fetch(RUMBLE_API_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Rumble API returned ${res.status}`);
    }

    const data = await res.json();
    consecutiveErrors = 0;
    return diffAndEmitEvents(data);
  } catch (err) {
    consecutiveErrors++;
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit("wrn", `Rumble poll failed (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${msg}`);

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      emit("err", "Too many consecutive Rumble API failures. Stopping poller.");
      stopRumblePoller();
    }
    return [];
  }
}

/* ─── Start / Stop ─── */
export function startRumblePoller(onEvent: EventCallback): () => void {
  if (!isRumbleConfigured()) {
    emit("wrn", "RUMBLE_API_URL not configured. Using mock events.");
    return () => {};
  }

  callbacks.push(onEvent);

  if (!isPolling) {
    isPolling = true;
    consecutiveErrors = 0;
    lastSnapshot = null;
    emit("sys", `Rumble poller started (interval: ${POLL_INTERVAL_MS / 1000}s)`);

    // Initial poll
    pollOnce().then((events) => {
      if (events.length === 0 && lastSnapshot) {
        emit("inf", `Connected to Rumble. Viewers: ${lastSnapshot.watching_now}`);
      }
      for (const event of events) {
        for (const cb of callbacks) cb(event);
      }
    });

    // Recurring poll
    pollTimer = setInterval(async () => {
      const events = await pollOnce();
      for (const event of events) {
        for (const cb of callbacks) cb(event);
      }
    }, POLL_INTERVAL_MS);
  }

  // Return unsubscribe function
  return () => {
    callbacks = callbacks.filter((cb) => cb !== onEvent);
    if (callbacks.length === 0) {
      stopRumblePoller();
    }
  };
}

export function stopRumblePoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPolling = false;
  callbacks = [];
  emit("sys", "Rumble poller stopped");
}
