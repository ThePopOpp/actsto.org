import type { ActSession, PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole, PORTAL_ROLES } from "@/lib/auth/types";

const COOKIE = "act_session";

export { COOKIE as SESSION_COOKIE_NAME };

const PORTAL_SET = new Set<string>(PORTAL_ROLES);

function portalRolesFromPayload(
  rolesRaw: unknown,
  activeRole: UserRole
): PortalRole[] {
  if (Array.isArray(rolesRaw)) {
    const filtered = rolesRaw.filter(
      (x): x is PortalRole => typeof x === "string" && PORTAL_SET.has(x)
    );
    if (filtered.length > 0) {
      return [...new Set(filtered)];
    }
  }
  return isPortalRole(activeRole) ? [activeRole] : [];
}

/** Normalizes legacy cookies that omitted `roles`. */
export function normalizeActSession(data: {
  email: string;
  name?: string;
  role: UserRole;
  roles?: unknown;
}): ActSession {
  return {
    email: data.email,
    name: (data.name ?? data.email.split("@")[0] ?? "User").trim(),
    role: data.role,
    roles: portalRolesFromPayload(data.roles, data.role),
  };
}

/** Edge-safe encode (ASCII JSON from email/role). */
export function encodeSession(session: ActSession): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(session))));
}

export function decodeSession(raw: string | undefined | null): ActSession | null {
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json) as {
      email?: string;
      name?: string;
      role?: UserRole;
      roles?: unknown;
    };
    if (!data?.email || !data?.role) return null;
    return normalizeActSession({
      email: data.email,
      name: data.name,
      role: data.role,
      roles: data.roles,
    });
  } catch {
    return null;
  }
}
