import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const threads = await prisma.emailThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      messages: {
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    messages: threads.map((thread) => {
      const latest = thread.messages[0];
      const body = latest?.bodyText ?? "";
      return {
        id: thread.id,
        fromName: thread.fromName ?? thread.fromEmail ?? "Unknown sender",
        fromEmail: thread.fromEmail ?? "",
        subject: thread.subject ?? latest?.subject ?? "(No subject)",
        preview: body.slice(0, 160),
        body,
        channel: "email",
        receivedAt: (latest?.receivedAt ?? thread.lastMessageAt).toISOString(),
        unread: thread.unread,
        flagged: thread.flagged,
        campaignSlug: thread.campaignSlug,
        campaignTitle: thread.campaignTitle,
      };
    }),
  });
}
