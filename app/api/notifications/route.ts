import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { DEFAULT_EMAIL_PREFERENCES } from "@/lib/email/preference-rules";
import { prisma } from "@/lib/prisma";

/**
 * Defaults live in lib/email/preferences.ts alongside the gate that reads them,
 * so the settings page and the sender can't disagree about what "unset" means.
 */
const DEFAULT_PREFS = { ...DEFAULT_EMAIL_PREFERENCES, smsOptIn: false };

/** Every boolean this endpoint accepts. Anything else in the body is ignored. */
const BOOLEAN_KEYS = Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[];

async function getProfileId(email: string) {
  const profile = await prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function GET() {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getProfileId(session.email);
  if (!userId) {
    return NextResponse.json({ preferences: DEFAULT_PREFS, notifications: [] });
  }

  const [prefs, notifications] = await Promise.all([
    prisma.communicationPreference.findUnique({ where: { userId } }).catch(() => null),
    prisma.dashboardNotification
      .findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 })
      .catch(() => []),
  ]);

  return NextResponse.json({
    preferences: prefs
      ? {
          emailOptIn: prefs.emailOptIn,
          smsOptIn: prefs.smsOptIn,
          transactionalEmailEnabled: prefs.transactionalEmailEnabled,
          marketingEmailEnabled: prefs.marketingEmailEnabled,
          donationUpdatesEnabled: prefs.donationUpdatesEnabled,
          campaignUpdatesEnabled: prefs.campaignUpdatesEnabled,
          campaignAlertsEnabled: prefs.campaignAlertsEnabled,
          featuredCampaignsEnabled: prefs.featuredCampaignsEnabled,
          productUpdatesEnabled: prefs.productUpdatesEnabled,
          scholarshipUpdatesEnabled: prefs.scholarshipUpdatesEnabled,
        }
      : DEFAULT_PREFS,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      notificationType: n.notificationType,
      readAt: n.readAt?.toISOString() ?? null,
      actionUrl: n.actionUrl,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function PUT(request: Request) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getProfileId(session.email);
  if (!userId) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    preferences?: Partial<typeof DEFAULT_PREFS>;
    markReadId?: string;
    markAllRead?: boolean;
  } | null;

  if (body?.markAllRead) {
    await prisma.dashboardNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (typeof body?.markReadId === "string") {
    await prisma.dashboardNotification.updateMany({
      where: { userId, id: body.markReadId },
      data: { readAt: new Date() },
    });
  }

  if (body?.preferences) {
    // Whitelist-and-coerce rather than spreading the body: an unexpected key
    // reaching Prisma is how a request body ends up setting a column nobody
    // meant to expose.
    const create: Record<string, boolean> = { ...DEFAULT_PREFS };
    const update: Record<string, boolean> = {};
    for (const key of BOOLEAN_KEYS) {
      const value = (body.preferences as Record<string, unknown>)[key];
      if (typeof value !== "boolean") continue;
      create[key] = value;
      update[key] = value;
    }

    // Turning off everything optional is an unsubscribe, and compliance asks
    // when it happened — "the row says false" is not an answer.
    const optionalKeys = BOOLEAN_KEYS.filter(
      (k) => k !== "emailOptIn" && k !== "smsOptIn" && k !== "transactionalEmailEnabled",
    );
    const turnedEverythingOff =
      optionalKeys.length > 0 && optionalKeys.every((k) => update[k] === false);

    await prisma.communicationPreference.upsert({
      where: { userId },
      create: { userId, ...create, ...(turnedEverythingOff ? { unsubscribedAllAt: new Date() } : {}) },
      update: { ...update, ...(turnedEverythingOff ? { unsubscribedAllAt: new Date() } : {}) },
    });
  }

  return NextResponse.json({ ok: true });
}
