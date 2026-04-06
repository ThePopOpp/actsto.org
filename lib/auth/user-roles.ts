import type { User } from "@prisma/client";

import type { PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole, PORTAL_ROLES } from "@/lib/auth/types";

const PORTAL_SET = new Set<string>(PORTAL_ROLES);

function isPortalRoleString(x: string): x is PortalRole {
  return PORTAL_SET.has(x);
}

/** Portal roles stored on the user row; falls back to legacy single `role`. */
export function portalRolesFromUser(user: User): PortalRole[] {
  const raw = user.roles;
  if (Array.isArray(raw)) {
    const parsed = raw.filter(
      (x): x is PortalRole => typeof x === "string" && isPortalRoleString(x)
    );
    if (parsed.length > 0) {
      return [...new Set(parsed)];
    }
  }
  const r = user.role as UserRole;
  return isPortalRole(r) ? [r] : [];
}
