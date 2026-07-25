import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { getTwilioRuntimeStatus } from "@/lib/sms/twilio";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [runtime, calls] = await Promise.all([
    getTwilioRuntimeStatus(),
    prisma.callLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ]);
  const campaignIds = Array.from(new Set(calls.map((c) => c.campaignId).filter(Boolean))) as string[];
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, title: true } })
    : [];
  const campaignTitle = new Map(campaigns.map((c) => [c.id, c.title]));

  return NextResponse.json({
    runtime,
    calls: calls.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      roleType: c.roleType,
      toPhone: c.toPhone,
      agentPhone: c.agentPhone,
      direction: c.direction,
      status: c.status,
      errorMessage: c.errorMessage,
      durationSeconds: c.durationSeconds,
      notes: c.notes,
      campaignId: c.campaignId,
      campaignTitle: c.campaignId ? campaignTitle.get(c.campaignId) ?? null : null,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
