import "server-only";

import { getClient, type OAuthClient } from "@/lib/mcp/oauth";

// Shared by the consent page and the form handler that receives its decision.

export type AuthorizeRequest = {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  scope: string;
  resource: string;
};

export const AUTHZ_FIELDS: (keyof AuthorizeRequest)[] = ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource"];

export function readAuthorize(get: (k: string) => string | null | undefined): AuthorizeRequest {
  return Object.fromEntries(AUTHZ_FIELDS.map((k) => [k, String(get(k) ?? "")])) as AuthorizeRequest;
}

/** Everything that must hold before we may redirect back to the client. */
export async function checkAuthorize(r: AuthorizeRequest): Promise<{ ok: true; client: OAuthClient } | { ok: false; error: string }> {
  if (r.response_type !== "code") return { ok: false, error: "Only response_type=code is supported." };
  const client = r.client_id ? await getClient(r.client_id) : null;
  if (!client) return { ok: false, error: "This app isn't registered with ACTSTO.ORG. Remove the connector and add it again." };
  if (!client.redirectUris.includes(r.redirect_uri)) return { ok: false, error: "The redirect address doesn't match what this app registered." };
  if (!r.code_challenge || r.code_challenge_method !== "S256") return { ok: false, error: "PKCE (S256) is required." };
  return { ok: true, client };
}

export { consentToken, verifyConsentToken } from "@/lib/mcp/consent-token";
