import { createHmac, timingSafeEqual } from "node:crypto";

import type { AuthorizeRequest } from "@/lib/mcp/consent";

function secret(): string {
  const s = process.env.MCP_OAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("MCP_OAUTH_SECRET (or AUTH_SECRET) must be set.");
  return s;
}

// Binds a consent form to the signed-in admin and this exact request, so a
// decision can't be replayed for another client or forged by another site.
export function consentToken(email: string, r: AuthorizeRequest, issuedAt = Date.now()): string {
  const mac = createHmac("sha256", secret()).update([email, r.client_id, r.redirect_uri, r.code_challenge, r.state, issuedAt].join("|")).digest("hex");
  return `${issuedAt}.${mac}`;
}

export function verifyConsentToken(token: string, email: string, r: AuthorizeRequest): boolean {
  const [ts, mac] = token.split(".");
  const issuedAt = Number(ts);
  if (!issuedAt || Date.now() - issuedAt > 15 * 60_000) return false;
  const expected = consentToken(email, r, issuedAt).split(".")[1];
  const a = Buffer.from(mac || ""), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
