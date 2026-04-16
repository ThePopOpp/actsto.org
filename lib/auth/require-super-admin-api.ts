import { NextResponse } from "next/server";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { getActSession } from "@/lib/auth/session-server";

export type SuperAdminApiOk = { ok: true; email: string };

export type SuperAdminApiFail = { ok: false; response: NextResponse };

export async function requireSuperAdminApi(): Promise<SuperAdminApiOk | SuperAdminApiFail> {
  const session = await getActSession();
  if (
    !session ||
    session.role !== "super_admin" ||
    !canAccessSuperAdminDashboard(session.email)
  ) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  return { ok: true, email: session.email };
}
