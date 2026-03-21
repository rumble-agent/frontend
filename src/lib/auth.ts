import { NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.AGENT_ADMIN_TOKEN ?? "";

/**
 * Auth check for mutation endpoints.
 * If AGENT_ADMIN_TOKEN is not set, all requests are allowed (single-user demo mode).
 * When set, requires constant-time matching via x-admin-token header.
 */
export function checkAuth(req: NextRequest): boolean {
  if (!ADMIN_TOKEN) return true;
  const header = req.headers.get("x-admin-token") ?? "";
  if (header.length !== ADMIN_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ ADMIN_TOKEN.charCodeAt(i);
  }
  return mismatch === 0;
}
