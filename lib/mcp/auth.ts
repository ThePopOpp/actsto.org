import "server-only";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { prisma } from "@/lib/prisma";
import { lookupToken, originOf, resourceUrl, sha256 } from "@/lib/mcp/oauth";
import { AGENT_SCOPES, type AgentScope } from "@/lib/mcp/scopes";

// Who is calling the MCP endpoint. Two ways in:
//  - an OAuth access token issued to a Super Admin (claude.ai, Claude Code,
//    ChatGPT, Codex). Humans in a chat client: full tool set.
//  - an agent bearer token from agent_identities (Claude Managed Agents via a
//    vault credential, Paperclip). Limited to the agent's scopes, and an agent
//    can never send anything itself: it drafts, a Super Admin approves.

export { AGENT_SCOPES, type AgentScope };

export type McpCaller =
  | { via: "oauth"; email: string; clientId: string; agentId?: undefined; scopes: AgentScope[] }
  | { via: "agent"; email: string; clientId: string; agentId: string; agentSlug: string; personaName: string; mailbox: string | null; scopes: AgentScope[] };

export async function isSuperAdminEmail(email: string): Promise<boolean> {
  if (!email) return false;
  if (canAccessSuperAdminDashboard(email)) return true;
  const profile = await prisma.profile
    .findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { isSuperAdmin: true } })
    .catch(() => null);
  return !!profile?.isSuperAdmin;
}

export async function authenticate(req: Request): Promise<McpCaller | null> {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const raw = m[1].trim();
  if (raw.length < 32) return null;

  // Agent tokens are prefixed so we know which table to look in.
  if (raw.startsWith("actagent_")) {
    const agent = await prisma.agentIdentity.findUnique({ where: { tokenHash: sha256(raw) } }).catch(() => null);
    if (!agent || !agent.enabled) return null;
    void prisma.agentIdentity.update({ where: { id: agent.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return {
      via: "agent",
      email: agent.mailbox || `${agent.slug}@agent`,
      clientId: `agent:${agent.slug}`,
      agentId: agent.id,
      agentSlug: agent.slug,
      personaName: agent.personaName,
      mailbox: agent.mailbox,
      scopes: agent.scopes.filter((s): s is AgentScope => (AGENT_SCOPES as string[]).includes(s)),
    };
  }

  const row = await lookupToken(raw, "access").catch(() => null);
  if (!row) return null;
  if (row.resource && row.resource !== resourceUrl(originOf(req))) return null;
  // Re-check on every call, so removing someone's Super Admin access cuts
  // off their connector immediately.
  if (!(await isSuperAdminEmail(row.email))) return null;
  return { via: "oauth", email: row.email, clientId: row.clientId, scopes: [...AGENT_SCOPES] };
}

/** 401 that tells the client where to start OAuth (RFC 9728). */
export function unauthorized(req: Request): Response {
  const origin = originOf(req);
  return Response.json(
    { error: "invalid_token", error_description: "Sign in to ACTSTO.ORG as a Super Admin to use this connector." },
    { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` } },
  );
}
