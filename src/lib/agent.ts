import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { StreamEvent, AgentDecision, AgentLogEntry, DecisionRecord, AgentStats } from "./types";
import { canTip, calculateSplit, getBudget, CHAIN } from "./wdk";

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
  if (logHistory.length > 200) logHistory.shift();
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

/* ─── Decision History (in-memory) ─── */
const decisionHistory: DecisionRecord[] = [];
const SESSION_START = Date.now();
let totalEventsEvaluated = 0;
let totalTipsSent = 0;
let totalTipsSkipped = 0;
let totalAmountTipped = 0;
let totalScoreSum = 0;
let llmUsageCount = 0;

function recordDecision(decision: AgentDecision, transactions: { tx_hash: string; amount: number; recipient: string }[], usedLLM: boolean) {
  const record: DecisionRecord = {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    decision,
    transactions: transactions.map((tx) => ({ ...tx, success: true, chain: CHAIN, timestamp: Date.now() })),
    usedLLM,
    timestamp: Date.now(),
  };
  decisionHistory.push(record);
  if (decisionHistory.length > 50) decisionHistory.shift();

  totalEventsEvaluated++;
  totalScoreSum += decision.score;
  if (usedLLM) llmUsageCount++;
  if (decision.should_tip) {
    totalTipsSent++;
    totalAmountTipped += decision.amount;
  } else {
    totalTipsSkipped++;
  }
}

export function getDecisionHistory(): DecisionRecord[] {
  return [...decisionHistory].reverse();
}

/** Attach transaction results to the most recent decision (called after sendTip) */
export function updateLastDecisionTx(transactions: { success: boolean; tx_hash: string; amount: number; recipient: string; chain: string; timestamp: number }[]) {
  if (decisionHistory.length === 0) return;
  const last = decisionHistory[decisionHistory.length - 1];
  last.transactions = transactions;
}

export function getAgentStats(): AgentStats {
  return {
    total_events_evaluated: totalEventsEvaluated,
    total_tips_sent: totalTipsSent,
    total_tips_skipped: totalTipsSkipped,
    total_amount_tipped: Number(totalAmountTipped.toFixed(2)),
    average_score: totalEventsEvaluated > 0 ? Number((totalScoreSum / totalEventsEvaluated).toFixed(2)) : 0,
    success_rate: totalEventsEvaluated > 0 ? Number(((totalTipsSent / totalEventsEvaluated) * 100).toFixed(1)) : 0,
    llm_usage_rate: totalEventsEvaluated > 0 ? Number(((llmUsageCount / totalEventsEvaluated) * 100).toFixed(1)) : 0,
    session_start: SESSION_START,
  };
}

/* ─── LLM Decision Schema ─── */
const tipDecisionSchema = z.object({
  should_tip: z.boolean().describe("Whether the agent should tip for this event"),
  amount: z.number().describe("Tip amount in USDT (0 if not tipping, min 0.50 if tipping)"),
  score: z.number().min(0).max(1).describe("Event significance score from 0.0 to 1.0"),
  reasoning: z.string().describe("1-2 sentence explanation of the decision"),
});

/* ─── LLM Agent Evaluation ─── */
async function evaluateWithLLM(
  event: StreamEvent,
  budget: { remaining: number; max_per_tip: number; spent_this_session: number; max_per_session: number }
): Promise<z.infer<typeof tipDecisionSchema>> {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: tipDecisionSchema,
    prompt: `You are an autonomous tipping agent for Rumble, a live streaming platform. You monitor stream events in real-time and decide whether creators deserve a tip based on engagement signals.

EVALUATE THIS EVENT:
Type: ${event.type}
Data: ${JSON.stringify(event.data)}

BUDGET STATE:
- Remaining: ${budget.remaining.toFixed(2)} USDT
- Max per tip: ${budget.max_per_tip} USDT
- Session spending: ${budget.spent_this_session.toFixed(2)} / ${budget.max_per_session} USDT

SCORING GUIDE:
- viewer_spike: Score by ratio of new/old viewers. 2x = 0.4, 3x = 0.6, 5x+ = 1.0
- new_subscriber: Base score 0.5-0.7 depending on context
- donation: Score 0.6-0.8, community engagement signal
- milestone: High value 0.8-1.0, these are rare achievements
- sentiment_shift: Score equals sentiment_score if above 0.7, otherwise skip

RULES:
- Threshold: Only tip if score >= 0.4
- If tipping, minimum amount is 0.50 USDT
- Scale tip amount with score: low scores get small tips, high scores get larger tips
- Never exceed max_per_tip or remaining budget
- Be conservative — don't burn budget on weak signals
- If budget is running low (< 20% remaining), raise threshold to 0.6

Respond with your decision.`,
  });

  return object;
}

/* ─── Rule-Based Fallback ─── */
function scoreEventFallback(event: StreamEvent): number {
  let score = 0;
  switch (event.type) {
    case "viewer_spike": {
      const prev = event.data.previous_viewer_count ?? 0;
      const curr = event.data.viewer_count ?? 0;
      if (prev > 0) score = Math.min((curr / prev) / 5, 1);
      break;
    }
    case "new_subscriber": score = 0.6; break;
    case "donation": score = 0.7; break;
    case "milestone": score = 0.85; break;
    case "sentiment_shift": {
      const s = event.data.sentiment_score ?? 0;
      score = s > 0.7 ? s : 0;
      break;
    }
  }
  return Math.round(score * 100) / 100;
}

function calculateTipAmount(score: number): number {
  const budget = getBudget();
  const maxTip = Math.min(budget.config.max_per_tip, budget.remaining);
  if (maxTip <= 0) return 0;
  const amount = Number((score * maxTip).toFixed(2));
  return Math.max(0.5, Math.min(amount, maxTip));
}

/* ─── LLM Rate Limiter ─── */
let lastLLMCall = 0;
const LLM_MIN_INTERVAL_MS = 2000; // minimum 2s between LLM calls

function canCallLLM(): boolean {
  const now = Date.now();
  if (now - lastLLMCall < LLM_MIN_INTERVAL_MS) return false;
  return true;
}

function hasValidApiKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return false;
  if (key.length < 20) return false;
  if (key.includes("your-") || key === "sk-ant-xxx") return false;
  return true;
}

/* ─── Agent Decision Engine ─── */
export async function evaluateEvent(
  event: StreamEvent,
  creatorAddress: string
): Promise<AgentDecision> {
  emit("evt", `Event received: ${event.type} — ${JSON.stringify(event.data)}`);

  const budget = getBudget();
  const budgetCtx = {
    remaining: budget.remaining,
    max_per_tip: budget.config.max_per_tip,
    spent_this_session: budget.spent_this_session,
    max_per_session: budget.config.max_per_session,
  };

  let decision: z.infer<typeof tipDecisionSchema>;
  let usedLLM = false;

  // Try LLM first, fall back to rules
  if (hasValidApiKey() && canCallLLM()) {
    try {
      emit("llm", "Reasoning with Claude...");
      lastLLMCall = Date.now();
      decision = await evaluateWithLLM(event, budgetCtx);
      usedLLM = true;
      emit("llm", `Claude: score=${decision.score} tip=${decision.should_tip ? `${decision.amount} USDT` : "skip"}`);
    } catch (err) {
      emit("wrn", `LLM failed: ${err instanceof Error ? err.message : "Unknown error"}. Using rule-based fallback.`);
      const score = scoreEventFallback(event);
      const amount = score >= 0.4 ? calculateTipAmount(score) : 0;
      decision = {
        should_tip: score >= 0.4 && amount > 0,
        amount,
        score,
        reasoning: `[Fallback] Event ${event.type} scored ${score}`,
      };
    }
  } else {
    emit("sys", "No API key configured. Using rule-based scoring.");
    const score = scoreEventFallback(event);
    const amount = score >= 0.4 ? calculateTipAmount(score) : 0;
    decision = {
      should_tip: score >= 0.4 && amount > 0,
      amount,
      score,
      reasoning: `[Rule-based] Event ${event.type} scored ${score}`,
    };
  }

  // Clamp amount to budget limits
  if (decision.should_tip) {
    decision.amount = Math.min(decision.amount, budget.config.max_per_tip, budget.remaining);
    decision.amount = Math.max(decision.amount, 0.50);
    decision.amount = Number(decision.amount.toFixed(2));
  }

  // Budget validation
  if (decision.should_tip) {
    const budgetCheck = canTip(decision.amount);
    if (!budgetCheck.allowed) {
      emit("wrn", `Budget blocked: ${budgetCheck.reason}`);
      const blockedDecision: AgentDecision = {
        should_tip: false,
        amount: 0,
        score: decision.score,
        reasoning: budgetCheck.reason!,
        split: [],
        event,
        timestamp: Date.now(),
      };
      recordDecision(blockedDecision, [], usedLLM);
      return blockedDecision;
    }
  }

  if (!decision.should_tip) {
    emit("llm", `Skipped: ${decision.reasoning}`);
    const skipDecision: AgentDecision = {
      should_tip: false,
      amount: 0,
      score: decision.score,
      reasoning: decision.reasoning,
      split: [],
      event,
      timestamp: Date.now(),
    };
    recordDecision(skipDecision, [], usedLLM);
    return skipDecision;
  }

  // Calculate splits
  const split = calculateSplit(decision.amount, creatorAddress);

  emit(usedLLM ? "act" : "llm", `→ Tip ${decision.amount} USDT | ${decision.reasoning}`);
  emit("inf", `Balance: ${budget.remaining.toFixed(2)} USDT remaining | Budget: ${((budget.spent_this_session / budget.config.max_per_session) * 100).toFixed(0)}% consumed`);

  const tipDecision: AgentDecision = {
    should_tip: true,
    amount: decision.amount,
    score: decision.score,
    reasoning: decision.reasoning,
    split,
    event,
    timestamp: Date.now(),
  };

  recordDecision(tipDecision, [], usedLLM);
  return tipDecision;
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
