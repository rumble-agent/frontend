import { NextResponse } from "next/server";
import { getAgentStats, getDecisionHistory } from "@/lib/agent";

export const dynamic = "force-dynamic";

/* GET /api/stats — Agent stats + decision history */
export async function GET() {
  return NextResponse.json({
    stats: getAgentStats(),
    history: getDecisionHistory(),
  });
}
