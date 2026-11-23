import "server-only";

import { randomToken, sha256 } from "@/lib/mcp/crypto";
import { prisma } from "@/lib/prisma";

export { randomToken, sha256, verifyPkce } from "@/lib/mcp/crypto";

// OAuth 2.1 for the ACT MCP connector (authorization code + PKCE, dynamic
// client registration, rotating refresh tokens). Used by claude.ai, Claude
// Code, ChatGPT and Codex. Codes and tokens are stored by SHA-256 hash; the raw
// values exist only in the HTTP response that hands them to the client.
// Ported from Channel Cast (lib/mcp/oauth.ts), with Prisma tables for storage.

export const ACCESS_TTL_S = 60 * 60; // 1 hour
export const REFRESH_TTL_S = 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_S = 10 * 60;
export const MCP_SCOPE = "act";


/** The public origin the client reached us on (the proxy forwards the host). */
export function originOf(req: Request): string {
  const env = process.env.MCP_PUBLIC_ORIGIN || process.env.APP_URL;
  if (env) return env.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto.split(",")[0]}://${host.split(",")[0]}`;
}
export const resourceUrl = (origin: string) => `${origin}/api/mcp`;

/* ── clients (RFC 7591 dynamic registration) ─────────────────────────── */

export type OAuthClient = { id: string; clientName: string; redirectUris: string[]; secretHash: string | null };

function validRedirect(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol === "https:") return true;
    // Native / CLI clients (Claude Code, Codex) use a loopback redirect.
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function registerClient(input: { client_name?: string; redirect_uris?: unknown; token_endpoint_auth_method?: string }) {
  const redirectUris = Array.isArray(input.redirect_uris) ? input.redirect_uris.map(String) : [];
  if (!redirectUris.length || redirectUris.length > 10 || !redirectUris.every(validRedirect)) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must be https URLs (or http loopback).");
  }
  const id = randomToken("actmcp");
  const confidential = input.token_endpoint_auth_method === "client_secret_post" || input.token_endpoint_auth_method === "client_secret_basic";
  const secret = confidential ? randomToken("actsec") : undefined;
  const client = await prisma.mcpOAuthClient.create({
    data: { id, clientName: String(input.client_name || "MCP client").slice(0, 120), redirectUris, secretHash: secret ? sha256(secret) : null },
  });
  return { client, secret };
}

export const getClient = (id: string): Promise<OAuthClient | null> => prisma.mcpOAuthClient.findUnique({ where: { id } });

/* ── authorization codes ─────────────────────────────────────────────── */

export async function issueCode(input: { clientId: string; redirectUri: string; codeChallenge: string; email: string; resource: string; scope: string }): Promise<string> {
  const code = randomToken("actcode");
  await prisma.mcpOAuthCode.create({ data: { codeHash: sha256(code), ...input, expiresAt: new Date(Date.now() + CODE_TTL_S * 1000) } });
  return code;
}

/** Single use: the code row is deleted whether or not it checks out. */
export async function consumeCode(code: string) {
  const codeHash = sha256(code);
  const row = await prisma.mcpOAuthCode.findUnique({ where: { codeHash } });
  if (row) await prisma.mcpOAuthCode.delete({ where: { codeHash } }).catch(() => {});
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/* ── access + refresh tokens ─────────────────────────────────────────── */

export async function issueTokens(input: { clientId: string; email: string; resource: string; scope: string }) {
  const access = randomToken("actat");
  const refresh = randomToken("actrt");
  const now = Date.now();
  await prisma.mcpOAuthToken.createMany({
    data: [
      { tokenHash: sha256(access), kind: "access", ...input, expiresAt: new Date(now + ACCESS_TTL_S * 1000) },
      { tokenHash: sha256(refresh), kind: "refresh", ...input, expiresAt: new Date(now + REFRESH_TTL_S * 1000) },
    ],
  });
  // Opportunistic cleanup so expired rows don't pile up.
  void prisma.mcpOAuthToken.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch(() => {});
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: input.scope };
}

export async function lookupToken(raw: string, kind: "access" | "refresh") {
  const row = await prisma.mcpOAuthToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!row || row.kind !== kind || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Refresh tokens rotate: the old one is revoked as the new pair is issued. */
export async function revokeToken(raw: string) {
  await prisma.mcpOAuthToken.delete({ where: { tokenHash: sha256(raw) } }).catch(() => {});
}

export class OAuthError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}
export const oauthErrorResponse = (e: unknown) => {
  if (e instanceof OAuthError) return Response.json({ error: e.code, error_description: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
  console.error("[mcp oauth]", e);
  return Response.json({ error: "server_error", error_description: "Unexpected error." }, { status: 500 });
};
