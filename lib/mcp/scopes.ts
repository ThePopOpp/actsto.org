// What an agent token may do. OAuth (Super Admin) callers get every scope.
export type AgentScope = "read" | "leads" | "outreach" | "social" | "inbox";
export const AGENT_SCOPES: AgentScope[] = ["read", "leads", "outreach", "social", "inbox"];
