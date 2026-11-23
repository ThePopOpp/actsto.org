import { timingSafeEqual } from "node:crypto";

import {
  consumeCode, getClient, issueTokens, lookupToken, OAuthError, oauthErrorResponse, revokeToken, sha256, verifyPkce, type OAuthClient,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
  }
  return Object.fromEntries(new URLSearchParams(await req.text()));
}

const sameHash = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Resolve the client and, for confidential clients, check its secret (post or basic). */
async function authClient(req: Request, p: Record<string, string>): Promise<OAuthClient> {
  let id = p.client_id, secret = p.client_secret;
  const basic = /^Basic\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (basic) {
    const [u, s] = Buffer.from(basic[1], "base64").toString().split(":");
    id = decodeURIComponent(u || "");
    secret = decodeURIComponent(s || "");
  }
  const client = id ? await getClient(id) : null;
  if (!client) throw new OAuthError("invalid_client", "Unknown client.", 401);
  if (client.secretHash && (!secret || !sameHash(sha256(secret), client.secretHash))) throw new OAuthError("invalid_client", "Bad client credentials.", 401);
  return client;
}

// POST /api/oauth/token: authorization_code (with PKCE) and refresh_token grants.
export async function POST(req: Request) {
  try {
    const p = await readParams(req);
    const client = await authClient(req, p);

    if (p.grant_type === "authorization_code") {
      const row = p.code ? await consumeCode(p.code) : null;
      if (!row || row.clientId !== client.id) throw new OAuthError("invalid_grant", "The authorization code is invalid or expired.");
      if (p.redirect_uri && p.redirect_uri !== row.redirectUri) throw new OAuthError("invalid_grant", "redirect_uri doesn't match.");
      if (!p.code_verifier || !verifyPkce(p.code_verifier, row.codeChallenge)) throw new OAuthError("invalid_grant", "PKCE verification failed.");
      const tokens = await issueTokens({ clientId: client.id, email: row.email, resource: row.resource, scope: row.scope });
      return Response.json(tokens, { headers: { "Cache-Control": "no-store" } });
    }

    if (p.grant_type === "refresh_token") {
      const row = p.refresh_token ? await lookupToken(p.refresh_token, "refresh") : null;
      if (!row || row.clientId !== client.id) throw new OAuthError("invalid_grant", "The refresh token is invalid or expired.");
      await revokeToken(p.refresh_token);
      const tokens = await issueTokens({ clientId: client.id, email: row.email, resource: row.resource, scope: row.scope });
      return Response.json(tokens, { headers: { "Cache-Control": "no-store" } });
    }

    throw new OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
  } catch (e) {
    return oauthErrorResponse(e);
  }
}
