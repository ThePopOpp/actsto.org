import { NextResponse } from "next/server";

import { EMAIL_CONSENT_COPY, EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, contactKeyFor, getContactState, newConsentToken, recordConsentEvent, upsertContactState } from "@/lib/consent/data";
import { sendEmail } from "@/lib/email/send";

function appUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://actsto.org").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; marketing?: boolean; campaignUpdates?: boolean; donationUpdates?: boolean }
    | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const meta = consentRequestMeta(request);
  const token = newConsentToken();
  const prev = await getContactState("email", contactKeyFor("email", email));

  await upsertContactState({
    channel: "email",
    email,
    contactName: body?.name ?? null,
    status: "pending",
    confirmed: false,
    confirmToken: token,
    confirmSentAt: new Date(),
    marketing: body?.marketing ?? false,
    campaignUpdates: body?.campaignUpdates ?? true,
    donationUpdates: body?.donationUpdates ?? true,
    disclosureVersion: EMAIL_CONSENT_DISCLOSURE_VERSION,
  });

  await recordConsentEvent({
    channel: "email",
    status: "opt_in",
    previousStatus: prev?.status ?? null,
    contactName: body?.name ?? null,
    email,
    disclosureVersion: EMAIL_CONSENT_DISCLOSURE_VERSION,
    consentText: EMAIL_CONSENT_COPY,
    source: "email_opt_in_page",
    meta,
    evidence: {
      pendingConfirm: true,
      categories: { marketing: body?.marketing ?? false, campaignUpdates: body?.campaignUpdates ?? true, donationUpdates: body?.donationUpdates ?? true },
    },
  });

  const confirmUrl = `${appUrl()}/email/confirm?token=${token}`;
  const text = `Please confirm your email subscription to Arizona Christian Tuition (ACTSTO.ORG).\n\nConfirm: ${confirmUrl}\n\nIf you didn't request this, you can ignore this message.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937">
    <p>Please confirm your email subscription to <strong>Arizona Christian Tuition (ACTSTO.ORG)</strong>.</p>
    <p><a href="${confirmUrl}" style="display:inline-block;background:#001138;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Confirm subscription</a></p>
    <p style="color:#6b7280;font-size:13px">If you didn't request this, you can ignore this message.</p>
  </div>`;
  await sendEmail({ to: email, subject: "Confirm your ACTSTO.ORG email subscription", text, html, templateKey: "email_consent_confirm" }).catch(() => {});

  return NextResponse.json({ ok: true, pendingConfirm: true });
}
