import { NextRequest, NextResponse } from "next/server";
import { evaluateEvent, getNextMockEvent } from "@/lib/agent";
import { sendTip } from "@/lib/wdk";
import type { StreamEvent } from "@/lib/types";

/* POST /api/agent — Evaluate an event and optionally execute tip */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Use provided event or generate a mock one (for demo)
    const event: StreamEvent = body.event ?? getNextMockEvent();
    const creatorAddress: string = body.creator_address ?? "0x_default_creator";

    // Agent evaluates the event
    const decision = await evaluateEvent(event, creatorAddress);

    // If agent decides to tip, execute via WDK
    if (decision.should_tip && body.execute !== false) {
      try {
        const txResults = await sendTip(decision.amount, creatorAddress);
        return NextResponse.json({
          decision,
          transactions: txResults,
        });
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
      { status: 400 }
    );
  }
}

/* GET /api/agent — Trigger a mock event (for demo/testing) */
export async function GET() {
  const event = getNextMockEvent();
  const decision = await evaluateEvent(event, "0x_demo_creator");

  if (decision.should_tip) {
    try {
      const txResults = await sendTip(decision.amount, "0x_demo_creator");
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
}
