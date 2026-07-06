import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { MAX_BULK_SMS_RECIPIENTS, sendAdminSms } from "@/lib/sms/send-admin-sms";
import { getTwilioRuntimeStatus, parsePhoneList } from "@/lib/sms/twilio";

function cleanMessage(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1600) : "";
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [runtime, logs] = await Promise.all([
    getTwilioRuntimeStatus(),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ]);
  const campaignIds = Array.from(new Set(logs.map((log) => log.campaignId).filter(Boolean))) as string[];
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

  return NextResponse.json({
    runtime,
    logs: logs.map((log) => ({
      id: log.id,
      direction: log.direction,
      fromPhone: log.fromPhone,
      toPhone: log.toPhone,
      message: log.message,
      status: log.status,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      contactName: log.contactName,
      contactEmail: log.contactEmail,
      roleType: log.roleType,
      profileId: log.profileId,
      campaignId: log.campaignId,
      campaignTitle: log.campaignId ? campaignMap.get(log.campaignId)?.title ?? null : null,
      campaignSlug: log.campaignId ? campaignMap.get(log.campaignId)?.slug ?? null : null,
      matchedPhone: log.matchedPhone,
      contactSource: log.contactSource,
      createdAt: log.createdAt.toISOString(),
      sentAt: log.sentAt?.toISOString() ?? null,
      deliveredAt: log.deliveredAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    to?: string;
    contacts?: string;
    message?: string;
    bulk?: boolean;
  } | null;
  const message = cleanMessage(body?.message);
  const recipients = body?.bulk ? parsePhoneList(body?.contacts ?? "") : parsePhoneList(body?.to ?? "");

  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (!recipients.length) return NextResponse.json({ error: "At least one recipient is required." }, { status: 400 });
  if (recipients.length > MAX_BULK_SMS_RECIPIENTS) {
    return NextResponse.json(
      { error: `Bulk SMS is limited to ${MAX_BULK_SMS_RECIPIENTS} recipients per send.` },
      { status: 400 }
    );
  }

  const results = await sendAdminSms(recipients, message);
  const sent = results.filter((result) => result.ok).length;
  return NextResponse.json({ ok: sent > 0, sent, failed: results.length - sent, results });
}
