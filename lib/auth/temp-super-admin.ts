import { timingSafeEqual } from "node:crypto";

/** True when both temporary bootstrap env vars are set. */
export function isTempSuperAdminConfigured(): boolean {
  const e = process.env.TEMP_SUPER_ADMIN_EMAIL?.trim();
  const p = process.env.TEMP_SUPER_ADMIN_PASSWORD;
  return Boolean(e && p !== undefined && p !== "");
}

/** Email configured for temp bootstrap (password checked at login only). */
export function isBootstrapSuperAdminEmail(email: string): boolean {
  if (!isTempSuperAdminConfigured()) return false;
  return (
    email.trim().toLowerCase() ===
    process.env.TEMP_SUPER_ADMIN_EMAIL!.trim().toLowerCase()
  );
}

/** This address must use `TEMP_SUPER_ADMIN_PASSWORD` when bootstrap is configured. */
export function isReservedTempSuperAdminEmail(email: string): boolean {
  if (!isTempSuperAdminConfigured()) return false;
  const envEmail = process.env.TEMP_SUPER_ADMIN_EMAIL!.trim().toLowerCase();
  return email.trim().toLowerCase() === envEmail;
}

/**
 * Optional QA / bootstrap login: set `TEMP_SUPER_ADMIN_EMAIL` and
 * `TEMP_SUPER_ADMIN_PASSWORD` in `.env`. That pair can sign in as any
 * account type selected on the login form. Unset both in production.
 */
export function isTempSuperAdminCredentials(
  email: string,
  password: string
): boolean {
  const envEmail = process.env.TEMP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const envPass = process.env.TEMP_SUPER_ADMIN_PASSWORD;
  if (!envEmail || envPass === undefined || envPass === "") {
    return false;
  }
  if (email.trim().toLowerCase() !== envEmail) {
    return false;
  }
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(envPass, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
