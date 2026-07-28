import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [jobs, pending, failed] = await Promise.all([
    prisma.automationJob.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { automation: { select: { name: true } } } }),
    prisma.automationJob.count({ where: { status: "pending" } }),
    prisma.automationJob.count({ where: { status: "failed" } }),
  ]);

  return NextResponse.json({
    pending,
    failed,
    jobs: jobs.map((j) => ({
      id: j.id,
      automation: j.automation.name,
      channel: j.channel,
      triggerEvent: j.triggerEvent,
      recipient: j.recipientEmail ?? j.recipientPhone ?? "—",
      status: j.status,
      scheduledFor: j.scheduledFor.toISOString(),
      sentAt: j.sentAt?.toISOString() ?? null,
      error: j.error,
    })),
  });
}
