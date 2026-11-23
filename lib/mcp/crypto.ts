import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Hashing and PKCE for the MCP OAuth server. No database here, so it's
// unit-testable.

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const randomToken = (prefix: string) => `${prefix}_${b64url(randomBytes(32))}`;

export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = b64url(createHash("sha256").update(verifier).digest());
  const a = Buffer.from(computed), b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}
