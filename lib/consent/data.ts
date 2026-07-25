import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

export type ConsentChannel = "email" | "sms";
export type ConsentStatus = "opt_in" | "opt_out" | "confirmed";

export type ConsentMeta = { ipAddress?: string | null; userAgent?: string | null; referrer?: string | null; sourceUrl?: string | null };

/** Pull IP / user-agent / referrer / URL evidence off an inbound request. */
export function consentRequestMeta(request: Request): ConsentMeta {
  const fwd = request.headers.get("x-forwarded-for");
  const ipAddress = fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return {
    ipAddress,
    userAgent: request.headers.get("user-agent") || null,
    referrer: request.headers.get("referer") || null,
    sourceUrl: request.url,
  };
}

export function newConsentToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export function contactKeyFor(channel: ConsentChannel, email?: string | null, phone?: string | null): string {
  if (channel === "email") return (email ?? "").trim().toLowerCase();
  return normalizePhone(phone ?? "");
}

type RecordArgs = {
  channel: ConsentChannel;
  category?: string;
  status: ConsentStatus;
  previousStatus?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  disclosureVersion: string;
  consentText: string;
  source: string;
  meta?: ConsentMeta;
  staffActorEmail?: string | null;
  providerRef?: string | null;
  evidence?: Prisma.InputJsonValue;
};

/** Append an immutable audit event. Never throws (consent must never be lost silently — but capture is best-effort). */
export async function recordConsentEvent(a: RecordArgs): Promise<void> {
  await prisma.consentEvent.create({
    data: {
      channel: a.channel,
      category: a.category ?? "all",
      status: a.status,
      previousStatus: a.previousStatus ?? null,
      contactName: a.contactName ?? null,
      email: a.email ?? null,
      phone: a.phone ?? null,
      phoneNormalized: a.phone ? normalizePhone(a.phone) : null,
      userId: a.userId ?? null,
      disclosureVersion: a.disclosureVersion,
      consentText: a.consentText,
      source: a.source,
      sourceUrl: a.meta?.sourceUrl ?? null,
      referrer: a.meta?.referrer ?? null,
      ipAddress: a.meta?.ipAddress ?? null,
      userAgent: a.meta?.userAgent ?? null,
      staffActorEmail: a.staffActorEmail ?? null,
      providerRef: a.providerRef ?? null,
      evidence: a.evidence ?? {},
    },
  });
}

export async function getContactState(channel: ConsentChannel, contactKey: string) {
  if (!contactKey) return null;
  return prisma.contactConsent.findUnique({ where: { channel_contactKey: { channel, contactKey } } });
}

type StateArgs = {
  channel: ConsentChannel;
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  contactName?: string | null;
  status?: string;
  marketing?: boolean;
  campaignUpdates?: boolean;
  donationUpdates?: boolean;
  confirmed?: boolean;
  confirmToken?: string | null;
  confirmSentAt?: Date | null;
  disclosureVersion?: string | null;
};

/** Upsert the effective consent state for a contact + channel. */
export async function upsertContactState(a: StateArgs) {
  const contactKey = contactKeyFor(a.channel, a.email, a.phone);
  // Identity fields (same in create + update; undefined = leave unchanged on update).
  const identity = {
    email: a.email?.trim().toLowerCase() ?? undefined,
    phone: a.phone ?? undefined,
    phoneNormalized: a.phone ? normalizePhone(a.phone) : undefined,
    userId: a.userId ?? undefined,
    contactName: a.contactName ?? undefined,
    confirmToken: a.confirmToken === undefined ? undefined : a.confirmToken,
    confirmSentAt: a.confirmSentAt === undefined ? undefined : a.confirmSentAt,
    disclosureVersion: a.disclosureVersion ?? undefined,
  };
  const flags = {
    status: a.status ?? undefined,
    marketing: a.marketing ?? undefined,
    campaignUpdates: a.campaignUpdates ?? undefined,
    donationUpdates: a.donationUpdates ?? undefined,
    confirmed: a.confirmed ?? undefined,
  };
  return prisma.contactConsent.upsert({
    where: { channel_contactKey: { channel: a.channel, contactKey } },
    create: {
      channel: a.channel,
      contactKey,
      ...identity,
      status: a.status ?? "subscribed",
      marketing: a.marketing ?? false,
      campaignUpdates: a.campaignUpdates ?? true,
      donationUpdates: a.donationUpdates ?? true,
      confirmed: a.confirmed ?? false,
    },
    update: { ...identity, ...flags },
  });
}
