import type { StreamEvent } from "./types";

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
  {
    type: "donation",
    timestamp: Date.now(),
    data: { sentiment: "positive", sentiment_score: 0.78 },
  },
  {
    type: "sentiment_shift",
    timestamp: Date.now(),
    data: { sentiment: "negative", sentiment_score: 0.3 },
  },
  {
    type: "new_subscriber",
    timestamp: Date.now(),
    data: { subscriber_id: "user_2941", sentiment: "neutral", sentiment_score: 0.5 },
  },
];

export function getNextMockEvent(): StreamEvent {
  const event = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
  return { ...event, timestamp: Date.now() };
}
