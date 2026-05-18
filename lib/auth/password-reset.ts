import { createHash, randomBytes } from "crypto";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function createPasswordResetToken() {
  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetExpiresAt(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
}

export function requestIpAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export function siteUrlFromEnv() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    process.env.APP_URL ||
    "https://actsto.org"
  ).replace(/\/+$/, "");
}

