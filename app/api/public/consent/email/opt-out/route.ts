import { NextResponse } from "next/server";

import { EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, contactKeyFor, getContactState, recordConsentEvent, upsertContactState } from "@/lib/consent/data";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const meta = consentRequestMeta(request);
  const prev = await getContactState("email", contactKeyFor("email", email));

  await recordConsentEvent({
    channel: "email",
    status: "opt_out",
    previousStatus: prev?.status ?? null,
    email,
    disclosureVersion: EMAIL_CONSENT_DISCLOSURE_VERSION,
    consentText: "User unsubscribed from ACTSTO marketing emails.",
    source: "email_opt_out_page",
    meta,
  });
  await upsertContactState({ channel: "email", email, status: "unsubscribed", marketing: false, campaignUpdates: false, donationUpdates: false });

  return NextResponse.json({ ok: true });
}
