import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// One-click unsubscribe links for agent outreach. The signature proves the
// link was issued for this address, so nobody can unsubscribe someone else by
// editing the URL.

function secret(): string {
  const s = process.env.MCP_OAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET must be set to sign unsubscribe links.");
  return s;
}

const sign = (email: string) => createHmac("sha256", secret()).update(`unsubscribe|${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);

export function unsubscribeUrl(origin: string, email: string): string {
  const e = email.trim().toLowerCase();
  return `${origin.replace(/\/$/, "")}/api/public/consent/email/unsubscribe?e=${encodeURIComponent(e)}&s=${sign(e)}`;
}

export function verifyUnsubscribe(email: string, signature: string): boolean {
  if (!email || !signature) return false;
  const a = Buffer.from(sign(email)), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
