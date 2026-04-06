import { isBootstrapSuperAdminEmail } from "@/lib/auth/temp-super-admin";

/**
 * Comma-separated emails that may sign in as Super Admin.
 * Set in `.env.local`: ADMIN_EMAILS=you@domain.com,other@domain.com
 */
export function getAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSuperAdminEmail(email: string): boolean {
  return getAdminEmailSet().has(email.trim().toLowerCase());
}

/** Super Admin UI: allowlist or temp bootstrap email (after login proved password). */
export function canAccessSuperAdminDashboard(email: string): boolean {
  return isSuperAdminEmail(email) || isBootstrapSuperAdminEmail(email);
}
