import { EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, contactKeyFor, getContactState, recordConsentEvent, upsertContactState } from "@/lib/consent/data";
import { verifyUnsubscribe } from "@/lib/consent/unsubscribe-link";
import { escapeHtml } from "@/lib/email/templates/layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signed one-click unsubscribe for agent outreach emails.
//   GET  shows a confirm button (link scanners follow GETs, so GET never unsubscribes)
//   POST unsubscribes; also accepts RFC 8058 "List-Unsubscribe=One-Click" from mail clients

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} · ACTSTO.ORG</title>` +
      `<body style="font-family:system-ui,-apple-system,sans-serif;background:#f6fbff;color:#091b36;margin:0;padding:48px 16px">` +
      `<main style="max-width:480px;margin:auto;background:#fff;border:1px solid #dbe5f1;border-radius:16px;padding:32px">` +
      `<h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

function read(url: URL) {
  return { email: (url.searchParams.get("e") ?? "").trim().toLowerCase(), sig: url.searchParams.get("s") ?? "" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { email, sig } = read(url);
  if (!verifyUnsubscribe(email, sig)) return page("Link not recognized", `<p>This unsubscribe link is incomplete. You can manage your email at <a href="/communication-preferences">communication preferences</a>.</p>`, 400);
  return page(
    "Unsubscribe from ACTSTO.ORG emails?",
    `<p>We'll stop sending outreach and marketing email to <strong>${escapeHtml(email)}</strong>.</p>` +
      `<form method="post"><button type="submit" style="background:#a62c2d;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const { email, sig } = read(url);
  if (!verifyUnsubscribe(email, sig)) return page("Link not recognized", "<p>This unsubscribe link is incomplete.</p>", 400);

  const prev = await getContactState("email", contactKeyFor("email", email));
  if (prev?.status !== "unsubscribed") {
    await recordConsentEvent({
      channel: "email",
      status: "opt_out",
      previousStatus: prev?.status ?? null,
      email,
      disclosureVersion: EMAIL_CONSENT_DISCLOSURE_VERSION,
      consentText: "Recipient unsubscribed using the one-click link in an ACTSTO outreach email.",
      source: "email_unsubscribe_link",
      meta: consentRequestMeta(request),
    });
    await upsertContactState({ channel: "email", email, status: "unsubscribed", marketing: false, campaignUpdates: false, donationUpdates: false });
  }
  return page("You're unsubscribed", `<p>${escapeHtml(email)} won't receive outreach email from ACTSTO.ORG again.</p>`);
}
