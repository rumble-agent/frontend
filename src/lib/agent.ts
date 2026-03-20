import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import type { StreamEvent, AgentDecision, AgentLogEntry, DecisionRecord, AgentStats } from "./types";
import { canTip, getBudget, CHAIN } from "./wdk";
export { getNextMockEvent } from "./mock-events";

/* ─── Log Store (in-memory, streamed via SSE) ─── */
type LogListener = (entry: AgentLogEntry) => void;
const listeners: Set<LogListener> = new Set();
const logHistory: AgentLogEntry[] = [];

export function emit(type: AgentLogEntry["type"], message: string): AgentLogEntry {
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

export function updateLastDecisionTx(transactions: { success: boolean; tx_hash: string; amount: number; recipient: string; chain: string; timestamp: number }[]) {
  if (decisionHistory.length === 0) return;
  decisionHistory[decisionHistory.length - 1].transactions = transactions;
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

/* ─── Cached Groq Client ─── */
const groq = createGroq();

/* ─── LLM Agent Evaluation ─── */
async function evaluateWithLLM(
  event: StreamEvent,
  budget: { remaining: number; max_per_tip: number; spent_this_session: number; max_per_session: number }
): Promise<z.infer<typeof tipDecisionSchema>> {
  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
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
  switch (event.type) {
    case "viewer_spike": {
      const prev = event.data.previous_viewer_count ?? 0;
      const curr = event.data.viewer_count ?? 0;
      return prev > 0 ? Math.round(Math.min((curr / prev) / 5, 1) * 100) / 100 : 0;
    }
    case "new_subscriber": return 0.6;
    case "donation": return 0.7;
    case "milestone": return 0.85;
    case "sentiment_shift": {
      const s = event.data.sentiment_score ?? 0;
      return s > 0.7 ? Math.round(s * 100) / 100 : 0;
    }
    default: return 0;
  }
}

function calculateTipAmount(score: number): number {
  const budget = getBudget();
  const maxTip = Math.min(budget.config.max_per_tip, budget.remaining);
  if (maxTip < 0.5) return 0;
  return Math.max(0.5, Math.min(Number((score * maxTip).toFixed(2)), maxTip));
}

function ruleBasedDecision(event: StreamEvent, label: string): z.infer<typeof tipDecisionSchema> {
  const score = scoreEventFallback(event);
  const amount = score >= 0.4 ? calculateTipAmount(score) : 0;
  return {
    should_tip: score >= 0.4 && amount > 0,
    amount,
    score,
    reasoning: `[${label}] Event ${event.type} scored ${score}`,
  };
}

/* ─── LLM Rate Limiter ─── */
let lastLLMCall = 0;
const LLM_MIN_INTERVAL_MS = 2000;

function canCallLLM(): boolean {
  return Date.now() - lastLLMCall >= LLM_MIN_INTERVAL_MS;
}

function hasValidApiKey(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!(key && key.length >= 20 && !key.includes("your-") && key !== "gsk_xxx");
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

  if (hasValidApiKey() && canCallLLM()) {
    try {
      emit("llm", "Reasoning with Groq LLM...");
      lastLLMCall = Date.now();
      decision = await evaluateWithLLM(event, budgetCtx);
      usedLLM = true;
      emit("llm", `LLM: score=${decision.score} tip=${decision.should_tip ? `${decision.amount} USDT` : "skip"}`);
    } catch (err) {
      emit("wrn", `LLM failed: ${err instanceof Error ? err.message : "Unknown error"}. Using rule-based fallback.`);
      decision = ruleBasedDecision(event, "Fallback");
    }
  } else {
    emit("sys", "No API key configured. Using rule-based scoring.");
    decision = ruleBasedDecision(event, "Rule-based");
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
      const blocked: AgentDecision = {
        should_tip: false, amount: 0, score: decision.score,
        reasoning: budgetCheck.reason ?? "Budget limit reached",
        event, timestamp: Date.now(),
      };
      recordDecision(blocked, [], usedLLM);
      return blocked;
    }
  }

  if (!decision.should_tip) {
    emit("llm", `Skipped: ${decision.reasoning}`);
    const skip: AgentDecision = {
      should_tip: false, amount: 0, score: decision.score,
      reasoning: decision.reasoning,
      event, timestamp: Date.now(),
    };
    recordDecision(skip, [], usedLLM);
    return skip;
  }

  emit(usedLLM ? "act" : "llm", `→ Tip ${decision.amount} USDT to ${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)} | ${decision.reasoning}`);
  emit("inf", `Balance: ${budget.remaining.toFixed(2)} USDT remaining | Budget: ${((budget.spent_this_session / budget.config.max_per_session) * 100).toFixed(0)}% consumed`);

  const tip: AgentDecision = {
    should_tip: true, amount: decision.amount, score: decision.score,
    reasoning: decision.reasoning,
    event, timestamp: Date.now(),
  };
  recordDecision(tip, [], usedLLM);
  return tip;
}
