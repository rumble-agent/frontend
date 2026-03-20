import { NextRequest, NextResponse } from "next/server";
import { getWalletState, getBudget, updateBudgetConfig, resetBudget } from "@/lib/wdk";

/* GET /api/wallet — Get wallet state + budget */
export async function GET() {
  try {
    const wallet = await getWalletState();
    const budget = getBudget();

    return NextResponse.json({ wallet, budget });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get wallet state" },
      { status: 500 }
    );
  }
}

/* POST /api/wallet — Update budget config or reset budget */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "reset_budget") {
      resetBudget();
      return NextResponse.json({ message: "Budget reset", budget: getBudget() });
    }

    if (body.budget_config) {
      const updated = updateBudgetConfig(body.budget_config);
      return NextResponse.json({ message: "Budget updated", config: updated, budget: getBudget() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update wallet" },
      { status: 400 }
    );
  }
}
