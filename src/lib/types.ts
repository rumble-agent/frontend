/* ─── Stream Event (input to agent) ─── */
export interface StreamEvent {
  type: "viewer_spike" | "new_subscriber" | "donation" | "milestone" | "sentiment_shift";
  timestamp: number;
  data: {
    viewer_count?: number;
    previous_viewer_count?: number;
    subscriber_id?: string;
    milestone_type?: string;
    sentiment?: "positive" | "neutral" | "negative";
    sentiment_score?: number;
  };
}

/* ─── Agent Decision (output from LLM reasoning) ─── */
export interface AgentDecision {
  should_tip: boolean;
  amount: number;
  score: number;
  reasoning: string;
  split: TipSplit[];
  event: StreamEvent;
  timestamp: number;
}

/* ─── Tip Split (how a tip is distributed) ─── */
export interface TipSplit {
  recipient: string;
  label: string;
  percentage: number;
  amount: number;
}

/* ─── Wallet State ─── */
export interface WalletState {
  address: string;
  balance: number;
  currency: string;
  chain: string;
}

/* ─── Budget Config ─── */
export interface BudgetConfig {
  max_per_session: number;
  max_per_tip: number;
  rate_limit_seconds: number;
  split_rules: {
    creator: number;
    editor: number;
    charity: number;
  };
}

/* ─── Budget Tracker (runtime state) ─── */
export interface BudgetTracker {
  spent_this_session: number;
  tips_count: number;
  last_tip_at: number | null;
  remaining: number;
}

/* ─── Agent Log Entry (sent to frontend via SSE) ─── */
export interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: "sys" | "ok" | "evt" | "llm" | "act" | "inf" | "wrn" | "err";
  message: string;
}

/* ─── Transaction Result ─── */
export interface TxResult {
  success: boolean;
  tx_hash: string;
  amount: number;
  recipient: string;
  chain: string;
  timestamp: number;
}
