import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getEmailTemplateById } from "@/lib/admin/email-templates";

export const dynamic = "force-dynamic";

/**
 * Renders a stored template exactly as it will send — inside the branded shell.
 *
 * The library used to preview `template.content` directly, which is only the
 * body blocks. That showed a bare paragraph and a button with no masthead, hero
 * or footer, so the preview was of something the recipient would never see. A
 * preview that doesn't match the send is worse than no preview.
 *
 * Server-side rather than assembling in the client: it keeps the email layout
 * out of the browser bundle, and it's the same code path the sender uses.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const template = await getEmailTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  // `content` is the finished email — masthead, hero, featured photo, body,
  // signature and footer — because that's what the sender puts on the wire.
  // Substituting the merge fields here keeps the preview readable; the real
  // send substitutes them per recipient.
  const html = (template.content ?? "").replace(/\{\{first_name\}\}/g, "Jeremy");

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // A preview must never be cached; the point is to see the current edit.
      "Cache-Control": "no-store",
    },
  });
}
