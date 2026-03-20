import { NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.AGENT_ADMIN_TOKEN ?? "";
const IS_DEV = process.env.NODE_ENV === "development";

export function checkAuth(req: NextRequest): boolean {
  if (!ADMIN_TOKEN) return IS_DEV;
  const header = req.headers.get("x-admin-token") ?? "";
  if (header.length !== ADMIN_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ ADMIN_TOKEN.charCodeAt(i);
  }
  return mismatch === 0;
}
