import { NextRequest, NextResponse } from "next/server";
import { getWalletState, getBudget, updateBudgetConfig, resetBudget, getCreatorAddress, setCreatorAddress } from "@/lib/wdk";
import { resetAgentState } from "@/lib/agent";
import { checkAuth } from "@/lib/auth";
import { isValidAddress } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BudgetConfigSchema = z.object({
  max_per_session: z.number().positive().optional(),
  max_per_tip: z.number().positive().optional(),
  rate_limit_seconds: z.number().nonnegative().optional(),
});

/* GET /api/wallet — Get wallet state + budget + creator address */
export async function GET() {
  try {
    const wallet = await getWalletState();
    const budget = getBudget();
    const creator_address = getCreatorAddress();

    return NextResponse.json({ wallet, budget, creator_address });
  } catch (err) {
    console.error("GET /api/wallet error:", err);
    return NextResponse.json(
      { error: "Failed to get wallet state" },
      { status: 500 }
    );
  }
}

/* POST /api/wallet — Update budget config, creator address, or reset budget */
export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (raw.action === "reset_budget") {
      resetBudget();
      resetAgentState();
      return NextResponse.json({ message: "Budget reset", budget: getBudget() });
    }

    if (raw.creator_address !== undefined) {
      if (!isValidAddress(raw.creator_address)) {
        return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
      }
      setCreatorAddress(raw.creator_address);
      return NextResponse.json({ message: "Creator address updated", creator_address: raw.creator_address });
    }

    if (raw.budget_config) {
      const parsed = BudgetConfigSchema.safeParse(raw.budget_config);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid budget config", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const updated = updateBudgetConfig(parsed.data);
      return NextResponse.json({ message: "Budget updated", config: updated, budget: getBudget() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/wallet error:", err);
    return NextResponse.json(
      { error: "Failed to update wallet" },
      { status: 500 }
    );
  }
}
