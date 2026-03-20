import type { StreamEvent, AgentDecision, AgentLogEntry } from "./types";
import { canTip, calculateSplit, getBudget } from "./wdk";

/* ─── Log Store (in-memory, streamed via SSE) ─── */
type LogListener = (entry: AgentLogEntry) => void;
const listeners: Set<LogListener> = new Set();
const logHistory: AgentLogEntry[] = [];

function emit(type: AgentLogEntry["type"], message: string): AgentLogEntry {
  const entry: AgentLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    type,
    message,
  };
  logHistory.push(entry);
  if (logHistory.length > 100) logHistory.shift();
  for (const listener of listeners) listener(entry);
  return entry;
}

export function subscribe(listener: LogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLogHistory(): AgentLogEntry[] {
  return [...logHistory];
}

/* ─── Event Scoring ─── */
function scoreEvent(event: StreamEvent): number {
  let score = 0;

  switch (event.type) {
    case "viewer_spike": {
      const prev = event.data.previous_viewer_count ?? 0;
      const curr = event.data.viewer_count ?? 0;
      if (prev > 0) {
        const ratio = curr / prev;
        score = Math.min(ratio / 5, 1); // 5x spike = 1.0
      }
      break;
    }
    case "new_subscriber":
      score = 0.6;
      break;
    case "donation":
      score = 0.7;
      break;
    case "milestone":
      score = 0.85;
      break;
    case "sentiment_shift": {
      const sentiment = event.data.sentiment_score ?? 0;
      score = sentiment > 0.7 ? sentiment : 0;
      break;
    }
  }

  return Math.round(score * 100) / 100;
}

/* ─── Tip Amount Calculation ─── */
function calculateTipAmount(score: number): number {
  const budget = getBudget();
  const maxTip = Math.min(budget.config.max_per_tip, budget.remaining);
  if (maxTip <= 0) return 0;
  // Scale tip: 0.5 at score=0.5, max at score=1.0
  const amount = Number((score * maxTip).toFixed(2));
  return Math.max(0.5, Math.min(amount, maxTip));
}

/* ─── Agent Decision Engine ─── */
// TODO: Replace scoring with actual LLM call (OpenClaw/Claude)
// This is the rule-based fallback; the LLM version will wrap this
// with natural language reasoning

export async function evaluateEvent(
  event: StreamEvent,
  creatorAddress: string
): Promise<AgentDecision> {
  emit("evt", `Event received: ${event.type} — ${JSON.stringify(event.data)}`);

  // Score the event
  const score = scoreEvent(event);
  emit("llm", `Evaluating... score=${score} type=${event.type}`);

  // Check threshold
  const THRESHOLD = 0.4;
  if (score < THRESHOLD) {
    emit("llm", `Score ${score} below threshold ${THRESHOLD}. Skipping.`);
    return {
      should_tip: false,
      amount: 0,
      score,
      reasoning: `Event score (${score}) below threshold (${THRESHOLD})`,
      split: [],
      event,
      timestamp: Date.now(),
    };
  }

  // Calculate tip amount
  const amount = calculateTipAmount(score);

  // Budget check
  const budgetCheck = canTip(amount);
  if (!budgetCheck.allowed) {
    emit("wrn", `Budget blocked: ${budgetCheck.reason}`);
    return {
      should_tip: false,
      amount: 0,
      score,
      reasoning: budgetCheck.reason!,
      split: [],
      event,
      timestamp: Date.now(),
    };
  }

  // Calculate splits
  const split = calculateSplit(amount, creatorAddress);
  const budget = getBudget();

  emit("llm", `score=${score} sentiment=${event.data.sentiment ?? "n/a"} → tip ${amount} USDT`);
  emit("inf", `Balance: ${budget.remaining.toFixed(2)} USDT remaining | Budget: ${((budget.spent_this_session / budget.config.max_per_session) * 100).toFixed(0)}% consumed`);

  return {
    should_tip: true,
    amount,
    score,
    reasoning: `Event ${event.type} scored ${score} (above ${THRESHOLD}). Tipping ${amount} USDT with smart split.`,
    split,
    event,
    timestamp: Date.now(),
  };
}

/* ─── Mock Event Simulator (for demo) ─── */
const MOCK_EVENTS: StreamEvent[] = [
  {
    type: "viewer_spike",
    timestamp: Date.now(),
    data: { viewer_count: 3891, previous_viewer_count: 1247, sentiment: "positive", sentiment_score: 0.87 },
  },
  {
    type: "new_subscriber",
    timestamp: Date.now(),
    data: { subscriber_id: "user_8172", sentiment: "positive", sentiment_score: 0.72 },
  },
  {
    type: "milestone",
    timestamp: Date.now(),
    data: { milestone_type: "10k_views", sentiment: "positive", sentiment_score: 0.95 },
  },
  {
    type: "sentiment_shift",
    timestamp: Date.now(),
    data: { sentiment: "positive", sentiment_score: 0.91 },
  },
  {
    type: "viewer_spike",
    timestamp: Date.now(),
    data: { viewer_count: 8420, previous_viewer_count: 3891, sentiment: "positive", sentiment_score: 0.88 },
  },
];

export function getNextMockEvent(): StreamEvent {
  const event = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
  return { ...event, timestamp: Date.now() };
}
