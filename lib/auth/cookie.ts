import { createHmac, timingSafeEqual } from "node:crypto";

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

/**
 * The act_session cookie is signed. It used to be bare base64 JSON, so anyone
 * could write {"role":"super_admin"} into it and be treated as a Super Admin
 * whenever there was no Supabase session. Unsigned, tampered, expired, or
 * secretless cookies now decode to null — fail closed.
 *
 * Node-only (node:crypto). Every importer is a Node route handler or
 * session-server.ts; never import this from middleware.ts (Edge runtime).
 */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function sessionSecret(): string | null {
  const secret = process.env.ACT_SESSION_SECRET || process.env.AUTH_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`act_session.v1.${payload}`).digest("base64url");
}

export function encodeSession(session: ActSession): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("AUTH_SECRET (or ACT_SESSION_SECRET) must be set to issue sessions.");
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(raw: string | undefined | null): ActSession | null {
  if (!raw) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(payload, secret), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      name?: string;
      role?: UserRole;
      roles?: unknown;
      exp?: number;
    };
    if (!data?.email || !data?.role) return null;
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
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
