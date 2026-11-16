import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/send";
import { requireProposalAdmin } from "@/lib/proposals/admin-api";
import { buildProposalEmail } from "@/lib/proposals/musk-scholars-fund/email";
import { proposalUrl, signerOf, siteBase } from "@/lib/proposals/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET — the rendered email (HTML, text, subject) for preview and Copy HTML.
 * POST { mode: "test" | "send", to?, subject? } — "test" goes to the signed-in
 * Super Admin only; "send" to the address given. Logged in Email history
 * (EmailLog, templateKey donor_proposal_musk) and the admin audit log.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const auth = await requireProposalAdmin(key);
  if (!auth.ok) return auth.response;
  const subject = new URL(request.url).searchParams.get("subject") ?? undefined;
  const p = auth.proposal;
  return NextResponse.json(
    buildProposalEmail({ signer: signerOf(p), landingUrl: p.enabled ? proposalUrl(p.token) : null, siteUrl: siteBase(), subject }),
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const auth = await requireProposalAdmin(key);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { mode?: unknown; to?: unknown; subject?: unknown } | null;
  const mode = body?.mode === "send" ? "send" : body?.mode === "test" ? "test" : null;
  if (!mode) return NextResponse.json({ error: "Choose test or send." }, { status: 400 });

  const to = mode === "test" ? auth.actor.email : typeof body?.to === "string" ? body.to.trim().toLowerCase() : "";
  if (!EMAIL.test(to)) return NextResponse.json({ error: "Enter a valid recipient email." }, { status: 400 });

  const p = auth.proposal;
  const signer = signerOf(p);
  const email = buildProposalEmail({
    signer,
    landingUrl: p.enabled ? proposalUrl(p.token) : null,
    siteUrl: siteBase(),
    subject: typeof body?.subject === "string" ? body.subject.slice(0, 200) : undefined,
  });

  try {
    const result = await sendEmail({
      to,
      subject: mode === "test" ? `[Test] ${email.subject}` : email.subject,
      html: email.html,
      text: email.text,
      templateKey: "donor_proposal_musk",
      replyTo: signer.email ?? undefined,
    });
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: mode === "test" ? "proposal.email_test" : "proposal.email_send",
      entityType: "donor_proposal",
      entityId: p.id,
      after: { key, to, subject: email.subject, linkIncluded: p.enabled, skipped: Boolean(result.skipped) },
    });
    if (result.skipped) {
      return NextResponse.json({ error: "Email isn't configured on this server, so nothing was sent." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, to });
  } catch (error) {
    console.error("[proposal email]", error);
    return NextResponse.json({ error: "The email didn't send. Check email settings and try again." }, { status: 502 });
  }
}
