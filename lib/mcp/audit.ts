import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { McpCaller } from "@/lib/mcp/auth";

// Every MCP tool call is written to mcp_audit_logs, so there is always a
// record of what an AI did on ACT's behalf.

// Message bodies can be long; the log keeps enough to identify the call.
function trimArgs(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 500 ? `${v.slice(0, 500)}… (${v.length} chars)` : v;
  if (Array.isArray(v)) return depth > 3 ? `[${v.length} items]` : v.slice(0, 25).map((x) => trimArgs(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 3) return "{…}";
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 40).map(([k, x]) => [k, trimArgs(x, depth + 1)]));
  }
  return v ?? {};
}

export async function writeAudit(caller: McpCaller, e: { tool: string; args: unknown; ok: boolean; error?: string; ms: number }): Promise<void> {
  await prisma.mcpAuditLog
    .create({
      data: {
        tool: e.tool,
        caller: caller.email,
        via: caller.via,
        clientId: caller.clientId,
        agentId: caller.agentId ?? null,
        args: JSON.parse(JSON.stringify(trimArgs(e.args))) as Prisma.InputJsonValue,
        ok: e.ok,
        error: e.error?.slice(0, 1000) ?? null,
        ms: e.ms,
      },
    })
    .catch((err) => console.warn("[mcp] audit write failed", err));
}
