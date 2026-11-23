import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { authenticate, unauthorized } from "@/lib/mcp/auth";
import { buildServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The ACT MCP endpoint (Streamable HTTP, stateless: a fresh server per request,
// JSON responses). Add it as a custom connector at https://actsto.org/api/mcp
// in claude.ai, Claude Code, ChatGPT (developer mode) or Codex; sign-in is
// limited to Super Admins. AI agents use a per-agent bearer token instead.
async function handle(req: Request): Promise<Response> {
  const caller = await authenticate(req);
  if (!caller) return unauthorized(req);

  const server = buildServer(caller);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req, {
      authInfo: { token: "redacted", clientId: caller.clientId, scopes: caller.scopes, extra: { email: caller.email } },
    });
  } finally {
    void server.close().catch(() => {});
  }
}

export { handle as GET, handle as POST, handle as DELETE };
