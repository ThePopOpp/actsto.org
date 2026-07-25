import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { getVoiceServerConfig } from "@/lib/voice/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [voice, calls] = await Promise.all([
    getVoiceServerConfig(),
    prisma.callLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
  ]);
  const campaignIds = Array.from(new Set(calls.map((c) => c.campaignId).filter(Boolean))) as string[];
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, title: true } })
    : [];
  const campaignTitle = new Map(campaigns.map((c) => [c.id, c.title]));

  return NextResponse.json({
    voice: { ready: voice.ready, callerIds: voice.callerIds },
    calls: calls.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      roleType: c.roleType,
      direction: c.direction,
      fromPhone: c.fromPhone,
      toPhone: c.toPhone,
      callerId: c.callerId,
      status: c.status,
      errorMessage: c.errorMessage,
      durationSeconds: c.durationSeconds,
      recordingUrl: c.recordingUrl,
      recordingDurationSeconds: c.recordingDurationSeconds,
      isVoicemail: c.isVoicemail,
      notes: c.notes,
      campaignId: c.campaignId,
      campaignTitle: c.campaignId ? campaignTitle.get(c.campaignId) ?? null : null,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
