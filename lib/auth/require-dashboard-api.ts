import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import type { UserRole } from "@/lib/auth/types";

export type DashboardApiOk = { ok: true; email: string; name: string; role: UserRole };
export type DashboardApiFail = { ok: false; response: NextResponse };

/**
 * Guard for features any signed-in dashboard user may use (e.g. their own
 * business cards). Super admins are unrestricted; ownership checks happen in the
 * data layer keyed on the session email.
 */
export async function requireDashboardApi(): Promise<DashboardApiOk | DashboardApiFail> {
  const session = await getActSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { ok: true, email: session.email, name: session.name, role: session.role };
}
