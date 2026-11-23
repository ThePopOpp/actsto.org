import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodRawShape } from "zod";

import type { AgentScope, McpCaller } from "@/lib/mcp/auth";
import { writeAudit } from "@/lib/mcp/audit";

export type ToolCtx = { caller: McpCaller };

type Kind = "read" | "write" | "destructive" | "outbound";

// Hints clients use to decide when to ask before running a tool. "outbound"
// reaches people outside ACT, so it's non-idempotent and open-world.
const HINTS: Record<Kind, ToolAnnotations> = {
  read: { readOnlyHint: true, openWorldHint: false },
  write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  destructive: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  outbound: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
};

export class ToolError extends Error {}

type Spec<S extends ZodRawShape> = {
  title: string;
  description: string;
  kind: Kind;
  /** Agents need this scope to see the tool. OAuth (Super Admin) callers have them all. */
  scope: AgentScope;
  /** Super Admins in a chat client only; never offered to agents. */
  humanOnly?: boolean;
  input: S;
};

/**
 * Register one tool with scope checks, audit logging and uniform error
 * handling. Tools the caller may not use are not registered at all, so they
 * never appear in the caller's tool list.
 */
export function defineTool<S extends ZodRawShape>(
  server: McpServer,
  ctx: ToolCtx,
  name: string,
  spec: Spec<S>,
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>,
) {
  const { caller } = ctx;
  if (spec.humanOnly && caller.via !== "oauth") return;
  if (!caller.scopes.includes(spec.scope)) return;

  server.registerTool(
    name,
    { title: spec.title, description: spec.description, inputSchema: spec.input, annotations: { title: spec.title, ...HINTS[spec.kind] } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async (args: any) => {
      const started = Date.now();
      try {
        const result = await handler(args);
        void writeAudit(caller, { tool: name, args, ok: true, ms: Date.now() - started });
        return { content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] };
      } catch (e) {
        const message = e instanceof ToolError ? e.message : "Something went wrong running this tool.";
        if (!(e instanceof ToolError)) console.error(`[mcp] ${name}`, e);
        void writeAudit(caller, { tool: name, args, ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

export { z };
