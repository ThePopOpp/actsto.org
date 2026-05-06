import { cookies } from "next/headers";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { PORTAL_ROLES } from "@/lib/auth/types";
import type { ActSession, PortalRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

function isPortalRoleStr(s: string | null | undefined): s is PortalRole {
  return !!s && (PORTAL_ROLES as readonly string[]).includes(s);
}

/**
 * Primary session getter used by all Server Components and layouts.
 *
 * Resolution order:
 *   1. Supabase Auth JWT  → Profile + user_roles from Prisma  (new path)
 *   2. act_session cookie                                       (legacy fallback)
 *
 * Returning null means the request is unauthenticated.
 */
export async function getActSession(): Promise<ActSession | null> {
  // ── 1. Try Supabase Auth ──────────────────────────────────────────────────
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user?.id) {
      const email = (user.email ?? "").toLowerCase();
      const meta = user.user_metadata as Record<string, string> | undefined;
      const fallbackName =
        meta?.full_name ?? meta?.name ?? email.split("@")[0] ?? "User";

      if (canAccessSuperAdminDashboard(email)) {
        return { email, name: fallbackName, role: "super_admin", roles: [] };
      }

      // Query Profile + roles from Prisma (may fail if DB pooler is still misconfigured)
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          include: { userRoles: { where: { status: "active" } } },
        });

        if (profile) {
          const name = (
            profile.displayName ??
            profile.fullName ??
            fallbackName
          ).trim();

          if (profile.isSuperAdmin || canAccessSuperAdminDashboard(email)) {
            return { email, name, role: "super_admin", roles: [] };
          }

          const roles = profile.userRoles
            .map((r) => r.role)
            .filter(isPortalRoleStr) as PortalRole[];

          const activeRole = isPortalRoleStr(profile.activeAccountType)
            ? (profile.activeAccountType as PortalRole)
            : roles[0] ?? "parent";

          return { email, name, role: activeRole, roles };
        }
      } catch {
        // Prisma DB unavailable — return a minimal session from the Supabase JWT
        return {
          email,
          name: fallbackName,
          role: "parent",
          roles: ["parent"],
        };
      }
    }
  } catch {
    // Supabase client error — fall through to legacy cookie
  }

  // ── 2. Legacy act_session cookie (migration fallback) ────────────────────
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
}
