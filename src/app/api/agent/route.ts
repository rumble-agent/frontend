import { NextRequest, NextResponse } from "next/server";
import { evaluateEvent, getNextMockEvent, updateLastDecisionTx } from "@/lib/agent";
import { sendTip, canTip, getCreatorAddress } from "@/lib/wdk";
import { checkAuth } from "@/lib/auth";
import { z } from "zod";

/* ─── Request Validation ─── */
const EventSchema = z.object({
  type: z.enum(["viewer_spike", "new_subscriber", "donation", "milestone", "sentiment_shift"]),
  timestamp: z.number(),
  data: z.object({
    viewer_count: z.number().optional(),
    previous_viewer_count: z.number().optional(),
    subscriber_id: z.string().optional(),
    milestone_type: z.string().optional(),
    sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    sentiment_score: z.number().min(0).max(1).optional(),
  }),
});

const PostBodySchema = z.object({
  event: EventSchema.optional(),
  creator_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address").optional(),
  execute: z.boolean().optional(),
});

/* POST /api/agent — Evaluate an event and optionally execute tip */
export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = PostBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const event = body.event ?? getNextMockEvent();
    const creatorAddress = body.creator_address ?? getCreatorAddress();

    // Agent evaluates the event
    const decision = await evaluateEvent(event, creatorAddress);

    // If agent decides to tip, execute via WDK
    if (decision.should_tip && body.execute === true) {
      // Re-check budget before executing (guard against race conditions)
      const budgetCheck = canTip(decision.amount);
      if (!budgetCheck.allowed) {
        return NextResponse.json({
          decision: { ...decision, should_tip: false, amount: 0, reasoning: budgetCheck.reason },
          transactions: [],
          error: budgetCheck.reason,
        });
      }
      try {
        const txResults = await sendTip(decision.amount, creatorAddress);
        updateLastDecisionTx(txResults);
        return NextResponse.json({ decision, transactions: txResults });
      } catch (err) {
        return NextResponse.json({
          decision,
          transactions: [],
          error: err instanceof Error ? err.message : "Transaction failed",
        });
      }
    }

    return NextResponse.json({ decision, transactions: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/* GET /api/agent — Evaluate a mock event (no execution, safe for demo) */
export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = getNextMockEvent();
    const decision = await evaluateEvent(event, getCreatorAddress());
    return NextResponse.json({ decision, transactions: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
