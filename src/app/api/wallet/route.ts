import { NextRequest, NextResponse } from "next/server";
import { getWalletState, getBudget, updateBudgetConfig, resetBudget } from "@/lib/wdk";
import { z } from "zod";

const ADMIN_TOKEN = process.env.AGENT_ADMIN_TOKEN ?? "";
const IS_DEV = process.env.NODE_ENV === "development";

function checkAuth(req: NextRequest): boolean {
  if (!ADMIN_TOKEN) return IS_DEV;
  const header = req.headers.get("x-admin-token") ?? "";
  if (header.length !== ADMIN_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ ADMIN_TOKEN.charCodeAt(i);
  }
  return mismatch === 0;
}

const SplitRulesSchema = z.object({
  creator: z.number().min(0).max(1),
  editor: z.number().min(0).max(1),
  charity: z.number().min(0).max(1),
}).refine((r) => Math.abs(r.creator + r.editor + r.charity - 1) < 0.001, {
  message: "Split rules must sum to 1.0",
});

const BudgetConfigSchema = z.object({
  max_per_session: z.number().positive().optional(),
  max_per_tip: z.number().positive().optional(),
  rate_limit_seconds: z.number().nonnegative().optional(),
  split_rules: SplitRulesSchema.optional(),
});

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
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (raw.action === "reset_budget") {
      resetBudget();
      return NextResponse.json({ message: "Budget reset", budget: getBudget() });
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update wallet" },
      { status: 400 }
    );
  }
}
