export interface WalletData {
  wallet: {
    address: string;
    balance: number;
    currency: string;
    chain: string;
    eth_balance: number;
    contracts: { usdt: string | null; tip_splitter: string | null };
  };
  budget: {
    spent_this_session: number;
    tips_count: number;
    last_tip_at: number | null;
    remaining: number;
    config: {
      max_per_session: number;
      max_per_tip: number;
      rate_limit_seconds: number;
    };
  };
  creator_address: string;
}

export interface StatsData {
  stats: {
    total_events_evaluated: number;
    total_tips_sent: number;
    total_tips_skipped: number;
    total_amount_tipped: number;
    average_score: number;
    success_rate: number;
    llm_usage_rate: number;
    session_start: number;
  };
  history: Array<{
    id: string;
    decision: {
      should_tip: boolean;
      amount: number;
      score: number;
      reasoning: string;
      event: { type: string; data: Record<string, unknown> };
    };
    transactions: Array<{ success: boolean; tx_hash: string; amount: number; recipient: string; chain: string }>;
    usedLLM: boolean;
    timestamp: number;
  }>;
}

export interface RumbleStatus {
  configured: boolean;
  polling: boolean;
  url_set: boolean;
}

export const LOG_COLORS: Record<string, string> = {
  sys: "text-zinc-500",
  inf: "text-zinc-400",
  ok: "text-emerald-400",
  evt: "text-violet-400",
  llm: "text-amber-400/70",
  act: "text-[#00D4FF]",
  wrn: "text-amber-400",
  err: "text-red-400",
};

export const EVENT_LABELS: Record<string, string> = {
  viewer_spike: "Viewer Spike",
  new_subscriber: "New Sub",
  donation: "Donation",
  milestone: "Milestone",
  sentiment_shift: "Sentiment",
};

export function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}
