import { NextResponse } from "next/server";

import { approveAndSendDraft, OutboundError, rejectDraft } from "@/lib/agents/outbound";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/agents/drafts/:id
//   { action: "send", subject?, bodyText? }  approve (with edits) and send now
//   { action: "reject", note? }
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { action?: string; subject?: string; bodyText?: string; note?: string } | null;

  try {
    if (body?.action === "send") {
      const result = await approveAndSendDraft(id, auth.email, { subject: body.subject, bodyText: body.bodyText });
      return NextResponse.json({ ok: true, ...result });
    }
    if (body?.action === "reject") {
      await rejectDraft(id, auth.email, body.note);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    if (e instanceof OutboundError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("[agents drafts]", e);
    return NextResponse.json({ error: "Something went wrong. Nothing was sent." }, { status: 500 });
  }
}
