import { NextResponse } from "next/server";

import { EMAIL_CONSENT_COPY, EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, contactKeyFor, getContactState, recordConsentEvent, upsertContactState, type ConsentChannel } from "@/lib/consent/data";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent-copy";

function normChannel(v: unknown): ConsentChannel {
  return v === "sms" ? "sms" : "email";
}

/** Lookup current state for a contact. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { channel?: string; email?: string; phone?: string } | null;
  const channel = normChannel(body?.channel);
  const key = contactKeyFor(channel, body?.email, body?.phone);
  if (!key) return NextResponse.json({ error: "Provide an email or phone." }, { status: 400 });
  const state = await getContactState(channel, key);
  return NextResponse.json({
    state: state
      ? {
          status: state.status,
          confirmed: state.confirmed,
          marketing: state.marketing,
          campaignUpdates: state.campaignUpdates,
          donationUpdates: state.donationUpdates,
          contactName: state.contactName,
        }
      : null,
  });
}

/** Update preferences for a contact. */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { channel?: string; email?: string; phone?: string; name?: string; status?: string; marketing?: boolean; campaignUpdates?: boolean; donationUpdates?: boolean }
    | null;
  const channel = normChannel(body?.channel);
  const key = contactKeyFor(channel, body?.email, body?.phone);
  if (!key) return NextResponse.json({ error: "Provide an email or phone." }, { status: 400 });

  const prev = await getContactState(channel, key);
  const status = body?.status ?? "subscribed";
  const disclosureVersion = channel === "email" ? EMAIL_CONSENT_DISCLOSURE_VERSION : SMS_CONSENT_DISCLOSURE_VERSION;

  await upsertContactState({
    channel,
    email: body?.email ?? null,
    phone: body?.phone ?? null,
    contactName: body?.name ?? null,
    status,
    marketing: channel === "email" ? body?.marketing : undefined,
    campaignUpdates: channel === "email" ? body?.campaignUpdates : undefined,
    donationUpdates: channel === "email" ? body?.donationUpdates : undefined,
    disclosureVersion,
  });

  await recordConsentEvent({
    channel,
    status: status === "unsubscribed" ? "opt_out" : "opt_in",
    previousStatus: prev?.status ?? null,
    contactName: body?.name ?? null,
    email: body?.email ?? null,
    phone: body?.phone ?? null,
    disclosureVersion,
    consentText: channel === "email" ? EMAIL_CONSENT_COPY : "Updated SMS preference via the Communication Preferences center.",
    source: "preferences_center",
    meta: consentRequestMeta(request),
    evidence: { marketing: body?.marketing, campaignUpdates: body?.campaignUpdates, donationUpdates: body?.donationUpdates },
  });

  return NextResponse.json({ ok: true });
}
