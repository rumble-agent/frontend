import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
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
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes("your-")) {
    try {
      emit("llm", "Reasoning with Claude...");
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
      return {
        should_tip: false,
        amount: 0,
        score: decision.score,
        reasoning: budgetCheck.reason!,
        split: [],
        event,
        timestamp: Date.now(),
      };
    }
  }

  if (!decision.should_tip) {
    emit("llm", `Skipped: ${decision.reasoning}`);
    return {
      should_tip: false,
      amount: 0,
      score: decision.score,
      reasoning: decision.reasoning,
      split: [],
      event,
      timestamp: Date.now(),
    };
  }

  // Calculate splits
  const split = calculateSplit(decision.amount, creatorAddress);

  emit(usedLLM ? "act" : "llm", `→ Tip ${decision.amount} USDT | ${decision.reasoning}`);
  emit("inf", `Balance: ${budget.remaining.toFixed(2)} USDT remaining | Budget: ${((budget.spent_this_session / budget.config.max_per_session) * 100).toFixed(0)}% consumed`);

  return {
    should_tip: true,
    amount: decision.amount,
    score: decision.score,
    reasoning: decision.reasoning,
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
  {
    type: "donation",
    timestamp: Date.now(),
    data: { sentiment: "positive", sentiment_score: 0.78 },
  },
];

export function getNextMockEvent(): StreamEvent {
  const event = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
  return { ...event, timestamp: Date.now() };
}
