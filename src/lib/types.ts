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
  event: StreamEvent;
  timestamp: number;
}

/* ─── Wallet State ─── */
export interface WalletState {
  address: string;
  balance: number;
  currency: string;
  chain: string;
  eth_balance: number;
  contracts: {
    usdt: string | null;
    tip_splitter: string | null;
  };
}

/* ─── Budget Config ─── */
export interface BudgetConfig {
  max_per_session: number;
  max_per_tip: number;
  rate_limit_seconds: number;
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

/* ─── Decision History Entry ─── */
export interface DecisionRecord {
  id: string;
  decision: AgentDecision;
  transactions: TxResult[];
  usedLLM: boolean;
  timestamp: number;
}

/* ─── Agent Stats (aggregated) ─── */
export interface AgentStats {
  total_events_evaluated: number;
  total_tips_sent: number;
  total_tips_skipped: number;
  total_amount_tipped: number;
  average_score: number;
  success_rate: number;
  llm_usage_rate: number;
  session_start: number;
}
