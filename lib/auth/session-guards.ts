import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/auth/paths";
import type { ActSession, PortalRole } from "@/lib/auth/types";

/**
 * Server layout guard: user must be signed in, not super_admin-only in portal routes,
 * must have the portal in assigned roles, and active session role must match this portal.
 */
export function requirePortalDashboardSession(
  session: ActSession | null,
  portal: PortalRole,
  loginNext: string,
  loginRoleDefault: PortalRole
): ActSession {
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent(loginNext)}&role=${encodeURIComponent(loginRoleDefault)}`
    );
  }
  if (session.role === "super_admin") {
    redirect("/dashboard/admin");
  }
  if (!session.roles.includes(portal)) {
    redirect("/dashboard?error=forbidden");
  }
  if (session.role !== portal) {
    redirect(dashboardPathForRole(session.role));
  }
  return session;
}
