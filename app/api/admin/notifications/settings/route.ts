import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: false,
  fromName: "Arizona Christian Tuition",
  fromEmail: "hello@actsto.org",
  replyTo: "hello@actsto.org",
  donationReceipts: true,
  campaignApproved: true,
  campaignNeedsChanges: true,
  campaignMilestones: true,
  taxCreditReminders: true,
  weeklyAdminDigest: false,
  adminNewDonation: true,
  adminDonationMinimum: 500,
  adminPaymentFailures: true,
  adminNewRegistrations: true,
  adminInboxSla: true,
  maxPerHour: 500,
  batchSize: 50,
  quietStart: "21:00",
  quietEnd: "07:00",
  defaultLocale: "en-US",
};

function normalize(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(raw as Record<string, unknown>) };
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [row, emailLogs, smsLogs, notifications] = await Promise.all([
    prisma.adminIntegrationSettings.findUnique({ where: { key: "notifications" } }).catch(() => null),
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }).catch(() => []),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }).catch(() => []),
    prisma.dashboardNotification.findMany({ orderBy: { createdAt: "desc" }, take: 12 }).catch(() => []),
  ]);

  const audit = [
    ...emailLogs.map((log) => ({
      id: log.id,
      channel: "Email",
      template: log.templateKey ?? log.subject ?? "Email",
      recipient: log.toEmail,
      status: log.status ?? "sent",
      createdAt: log.createdAt.toISOString(),
    })),
    ...smsLogs.map((log) => ({
      id: log.id,
      channel: "SMS",
      template: "SMS message",
      recipient: log.toPhone,
      status: log.status ?? "queued",
      createdAt: log.createdAt.toISOString(),
    })),
    ...notifications.map((log) => ({
      id: log.id,
      channel: "In-app",
      template: log.notificationType ?? log.title,
      recipient: log.userId,
      status: log.readAt ? "read" : "unread",
      createdAt: log.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  return NextResponse.json({ settings: normalize(row?.payload), audit });
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { settings?: unknown } | null;
  const settings = normalize(body?.settings);
  await prisma.adminIntegrationSettings.upsert({
    where: { key: "notifications" },
    create: { key: "notifications", payload: settings },
    update: { payload: settings },
  });
  return NextResponse.json({ ok: true, settings });
}
