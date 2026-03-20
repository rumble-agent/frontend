import { NextRequest, NextResponse } from "next/server";
import { isRumbleConfigured, getRumbleStatus, startRumblePoller, stopRumblePoller } from "@/lib/rumble";
import { evaluateEvent, updateLastDecisionTx } from "@/lib/agent";
import { sendTip, canTip, getCreatorAddress } from "@/lib/wdk";
import { checkAuth } from "@/lib/auth";

/* GET /api/rumble — Check Rumble integration status */
export async function GET() {
  return NextResponse.json(getRumbleStatus());
}

/* POST /api/rumble — Start or stop the Rumble poller */
export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (body.action === "start") {
      if (!isRumbleConfigured()) {
        return NextResponse.json(
          { error: "RUMBLE_API_URL not configured. Set it in .env.local" },
          { status: 400 }
        );
      }

      const creatorAddress = body.creator_address ?? getCreatorAddress();
      const executeOnChain = body.execute ?? false;

      startRumblePoller(async (event) => {
        // Agent evaluates each Rumble event
        const decision = await evaluateEvent(event, creatorAddress);

        // Execute tip on-chain if configured
        if (decision.should_tip && executeOnChain) {
          const budgetCheck = canTip(decision.amount);
          if (budgetCheck.allowed) {
            try {
              const txResults = await sendTip(decision.amount, creatorAddress);
              updateLastDecisionTx(txResults);
            } catch {
              // Transaction errors are logged by sendTip
            }
          }
        }
      });

      return NextResponse.json({ status: "started", ...getRumbleStatus() });
    }

    if (body.action === "stop") {
      stopRumblePoller();
      return NextResponse.json({ status: "stopped", ...getRumbleStatus() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
