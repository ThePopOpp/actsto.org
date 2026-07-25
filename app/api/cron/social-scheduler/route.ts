import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Scheduled-post runner. Hit this on a schedule (Coolify scheduled task, external
 * cron, or Supabase pg_cron) with `Authorization: Bearer $CRON_SECRET` or `?key=`.
 * It flips due scheduled posts to "due" and notifies Super Admins to publish them.
 * We don't auto-post (no third-party publishing APIs yet) — this is a reminder.
 */
async function run(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });

  const url = new URL(request.url);
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const due = await prisma.socialPost.findMany({
    where: { status: "scheduled", notifiedAt: null, scheduledAt: { not: null, lte: now } },
    select: { id: true, title: true, platform: true },
  });
  if (due.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  const admins = await prisma.profile.findMany({ where: { isSuperAdmin: true }, select: { id: true } });

  for (const post of due) {
    if (admins.length) {
      await prisma.dashboardNotification
        .createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: "Social post ready to publish",
            message: `“${post.title}” (${post.platform}) is scheduled for now. Export it and post.`,
            notificationType: "social_due",
            actionUrl: "/dashboard/admin/social",
          })),
        })
        .catch(() => null);
    }
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "due", notifiedAt: now } }).catch(() => null);
  }

  return NextResponse.json({ ok: true, processed: due.length });
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}
