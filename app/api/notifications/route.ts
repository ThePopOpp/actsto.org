import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PREFS = {
  emailOptIn: true,
  smsOptIn: false,
  transactionalEmailEnabled: true,
  marketingEmailEnabled: false,
  donationUpdatesEnabled: true,
  campaignUpdatesEnabled: true,
};

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
    const p = body.preferences;
    await prisma.communicationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailOptIn: p.emailOptIn ?? DEFAULT_PREFS.emailOptIn,
        smsOptIn: p.smsOptIn ?? DEFAULT_PREFS.smsOptIn,
        transactionalEmailEnabled:
          p.transactionalEmailEnabled ?? DEFAULT_PREFS.transactionalEmailEnabled,
        marketingEmailEnabled: p.marketingEmailEnabled ?? DEFAULT_PREFS.marketingEmailEnabled,
        donationUpdatesEnabled: p.donationUpdatesEnabled ?? DEFAULT_PREFS.donationUpdatesEnabled,
        campaignUpdatesEnabled: p.campaignUpdatesEnabled ?? DEFAULT_PREFS.campaignUpdatesEnabled,
      },
      update: {
        emailOptIn: p.emailOptIn,
        smsOptIn: p.smsOptIn,
        transactionalEmailEnabled: p.transactionalEmailEnabled,
        marketingEmailEnabled: p.marketingEmailEnabled,
        donationUpdatesEnabled: p.donationUpdatesEnabled,
        campaignUpdatesEnabled: p.campaignUpdatesEnabled,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
