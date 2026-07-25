import { NextResponse } from "next/server";

import { EMAIL_CONSENT_COPY, EMAIL_CONSENT_DISCLOSURE_VERSION } from "@/lib/consent/constants";
import { consentRequestMeta, contactKeyFor, getContactState, recordConsentEvent, upsertContactState, type ConsentChannel } from "@/lib/consent/data";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent-copy";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { phoneNormalized: { contains: q } }] }
    : {};

  const [events, emailSubs, smsSubs, optOuts, contacts] = await Promise.all([
    prisma.consentEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.contactConsent.count({ where: { channel: "email", status: "subscribed" } }),
    prisma.contactConsent.count({ where: { channel: "sms", status: "subscribed" } }),
    prisma.contactConsent.count({ where: { status: "unsubscribed" } }),
    prisma.contactConsent.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);

  return NextResponse.json({
    stats: { emailSubs, smsSubs, optOuts, totalEvents: await prisma.consentEvent.count() },
    events: events.map((e) => ({
      id: e.id, channel: e.channel, category: e.category, status: e.status, previousStatus: e.previousStatus,
      contactName: e.contactName, email: e.email, phone: e.phone, source: e.source, disclosureVersion: e.disclosureVersion,
      staffActorEmail: e.staffActorEmail, ipAddress: e.ipAddress, createdAt: e.createdAt.toISOString(),
    })),
    contacts: contacts.map((c) => ({
      id: c.id, channel: c.channel, email: c.email, phone: c.phone, contactName: c.contactName, status: c.status,
      confirmed: c.confirmed, marketing: c.marketing, campaignUpdates: c.campaignUpdates, donationUpdates: c.donationUpdates,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

/** Staff manual opt-in / opt-out — logged with the acting admin. */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { channel?: string; email?: string; phone?: string; name?: string; status?: string } | null;
  const channel: ConsentChannel = body?.channel === "sms" ? "sms" : "email";
  const key = contactKeyFor(channel, body?.email, body?.phone);
  if (!key) return NextResponse.json({ error: "Provide an email or phone." }, { status: 400 });
  const status = body?.status === "unsubscribed" ? "unsubscribed" : "subscribed";
  const disclosureVersion = channel === "email" ? EMAIL_CONSENT_DISCLOSURE_VERSION : SMS_CONSENT_DISCLOSURE_VERSION;

  const prev = await getContactState(channel, key);
  await upsertContactState({ channel, email: body?.email ?? null, phone: body?.phone ?? null, contactName: body?.name ?? null, status, confirmed: status === "subscribed", disclosureVersion });
  await recordConsentEvent({
    channel,
    status: status === "unsubscribed" ? "opt_out" : "opt_in",
    previousStatus: prev?.status ?? null,
    contactName: body?.name ?? null,
    email: body?.email ?? null,
    phone: body?.phone ?? null,
    disclosureVersion,
    consentText: channel === "email" ? EMAIL_CONSENT_COPY : "Staff-recorded SMS consent action.",
    source: "admin",
    staffActorEmail: auth.email,
    meta: consentRequestMeta(request),
    evidence: { manualByStaff: true },
  });

  return NextResponse.json({ ok: true });
}
