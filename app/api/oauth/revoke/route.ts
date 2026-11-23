import { revokeToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

// POST /api/oauth/revoke: RFC 7009. Always 200, whether or not the token existed.
export async function POST(req: Request) {
  const p = new URLSearchParams(await req.text());
  const token = p.get("token");
  if (token) await revokeToken(token).catch(() => {});
  return new Response(null, { status: 200 });
}
