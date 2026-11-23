import { MCP_SCOPE, originOf, resourceUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" };

// RFC 9728 protected-resource metadata, served at
// /.well-known/oauth-protected-resource[/api/mcp] via a rewrite in next.config.ts.
export async function GET(req: Request) {
  const origin = originOf(req);
  return Response.json(
    {
      resource: resourceUrl(origin),
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      scopes_supported: [MCP_SCOPE],
      resource_name: "ACTSTO.ORG",
    },
    { headers },
  );
}
