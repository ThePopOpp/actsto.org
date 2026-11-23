import { randomBytes } from "node:crypto";

import { AGENT_SCOPES, type AgentScope } from "@/lib/mcp/scopes";

// The agent roster's pure parts (no database), so they're unit-testable.

export const AGENT_ROLES = ["researcher", "qualifier", "outreach", "social", "inbox"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const ROLE_LABEL: Record<AgentRole, string> = {
  researcher: "Lead Researcher",
  qualifier: "Lead Qualifier",
  outreach: "Outreach Writer",
  social: "Social Content",
  inbox: "Inbox Triage",
};

/** Starting set. Personas are editable; every one is presented as an AI assistant. */
export const STARTER_AGENTS: { slug: string; personaName: string; role: AgentRole; scopes: AgentScope[]; description: string }[] = [
  { slug: "ava-research", personaName: "Ava", role: "researcher", scopes: ["read", "leads"], description: "Finds Arizona taxpayers, businesses, schools, churches and CPAs from public sources and records them as leads." },
  { slug: "eli-qualify", personaName: "Eli", role: "qualifier", scopes: ["read", "leads"], description: "Scores and enriches new leads, removes duplicates, and moves good ones to qualified." },
  { slug: "grace-outreach", personaName: "Grace", role: "outreach", scopes: ["read", "outreach"], description: "Drafts personal outreach emails for qualified leads, for staff approval." },
  { slug: "micah-social", personaName: "Micah", role: "social", scopes: ["read", "social"], description: "Drafts posts for ACT's official LinkedIn, Facebook and Instagram pages." },
  { slug: "ruth-inbox", personaName: "Ruth", role: "inbox", scopes: ["read", "leads", "outreach", "inbox"], description: "Reads replies, updates lead stages, honors opt-outs, and drafts responses." },
];

export const cleanScopes = (s: unknown): AgentScope[] =>
  Array.isArray(s) ? Array.from(new Set(s.filter((x): x is AgentScope => (AGENT_SCOPES as string[]).includes(String(x))))) : [];

export function newAgentToken(): string {
  return `actagent_${randomBytes(32).toString("base64url")}`;
}
