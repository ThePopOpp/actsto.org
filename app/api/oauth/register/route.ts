import { oauthErrorResponse, registerClient } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

// POST /api/oauth/register: RFC 7591 dynamic client registration. Open by
// design (Claude and ChatGPT register themselves); a client can do nothing
// until a Super Admin approves it on the consent screen.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { client, secret } = await registerClient(body);
    return Response.json(
      {
        client_id: client.id,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: secret ? "client_secret_post" : "none",
        ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return oauthErrorResponse(e);
  }
}
