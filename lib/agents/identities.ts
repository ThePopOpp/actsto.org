import "server-only";

import { newAgentToken, STARTER_AGENTS } from "@/lib/agents/roster";
import { sha256 } from "@/lib/mcp/crypto";
import { prisma } from "@/lib/prisma";

// AI agent identities. Each one maps to a Claude Managed Agent (the worker)
// and a Paperclip agent (the manager's view of it). Its MCP token is shown
// once when issued and stored only as a hash.

export { AGENT_ROLES, ROLE_LABEL, STARTER_AGENTS, cleanScopes, newAgentToken, type AgentRole } from "@/lib/agents/roster";

/** Issue (or rotate) an agent's token. Returns the raw token: show it once. */
export async function issueAgentToken(agentId: string): Promise<string> {
  const token = newAgentToken();
  await prisma.agentIdentity.update({ where: { id: agentId }, data: { tokenHash: sha256(token), tokenHint: token.slice(-4) } });
  return token;
}

export async function seedStarterAgents(createdByEmail: string) {
  let created = 0;
  for (const a of STARTER_AGENTS) {
    const exists = await prisma.agentIdentity.findUnique({ where: { slug: a.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.agentIdentity.create({ data: { ...a, enabled: false, createdByEmail } });
    created++;
  }
  return created;
}
