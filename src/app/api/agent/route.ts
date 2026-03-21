import { NextRequest, NextResponse } from "next/server";
import { evaluateEvent, emit, getNextMockEvent, updateLastDecisionTx } from "@/lib/agent";
import { sendTip, canTip, getCreatorAddress } from "@/lib/wdk";
import { checkAuth } from "@/lib/auth";
import { isValidAddress } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

    if (!creatorAddress || !isValidAddress(creatorAddress)) {
      return NextResponse.json({ error: "Creator address not configured" }, { status: 400 });
    }

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
        emit("sys", `Executing on-chain tip: ${decision.amount} USDT → ${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`);
        emit("inf", "Waiting for on-chain confirmation (typically 15-45s on Sepolia)...");
        const txResults = await sendTip(decision.amount, creatorAddress);
        updateLastDecisionTx(txResults);
        const tx = txResults[0];
        if (tx?.success && tx.tx_hash) {
          emit("ok", `TX confirmed: ${tx.tx_hash}`);
        } else {
          emit("err", `TX failed: ${tx?.tx_hash ? "reverted" : "no hash returned"}`);
        }
        return NextResponse.json({ decision, transactions: txResults });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        emit("err", `TX error: ${msg}`);
        return NextResponse.json({
          decision,
          transactions: [],
          error: msg,
        });
      }
    }

    return NextResponse.json({ decision, transactions: [] });
  } catch (err) {
    console.error("POST /api/agent error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
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
    console.error("GET /api/agent error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
