import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { isPushConfigured, sendPush, type PushPayload } from "@/lib/push/web-push";

const MAX_TITLE = 120;
const MAX_BODY = 480;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [subscriberCount, signedInCount, broadcasts] = await Promise.all([
    prisma.pushSubscription.count().catch(() => 0),
    prisma.pushSubscription.count({ where: { userId: { not: null } } }).catch(() => 0),
    prisma.pushBroadcast
      .findMany({ orderBy: { createdAt: "desc" }, take: 25 })
      .catch(() => []),
  ]);

  return NextResponse.json({
    configured: isPushConfigured(),
    subscriberCount,
    signedInCount,
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      url: b.url,
      audience: b.audience,
      sentByEmail: b.sentByEmail,
      recipientCount: b.recipientCount,
      successCount: b.successCount,
      failureCount: b.failureCount,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured. Add the VAPID environment variables." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    body?: string;
    url?: string;
    audience?: string;
  } | null;

  const title = clean(body?.title, MAX_TITLE);
  const message = clean(body?.body, MAX_BODY);
  const url = clean(body?.url, 500) || "/dashboard";
  const audience = body?.audience === "signed_in" ? "signed_in" : "all";

  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });

  const subscriptions = await prisma.pushSubscription.findMany({
    where: audience === "signed_in" ? { userId: { not: null } } : {},
    select: { id: true, endpoint: true, p256dh: true, auth: true, userId: true },
  });

  // Record the broadcast up front so we always have an id for the payload.
  const broadcast = await prisma.pushBroadcast.create({
    data: {
      title,
      body: message,
      url,
      audience,
      sentByEmail: auth.email,
      recipientCount: subscriptions.length,
    },
  });

  const payload: PushPayload = {
    title,
    body: message,
    url,
    tag: `broadcast-${broadcast.id}`,
    broadcastId: broadcast.id,
  };

  const staleEndpoints: string[] = [];
  let success = 0;
  let failure = 0;

  // Send in bounded batches to avoid opening too many sockets at once.
  const BATCH = 100;
  for (let i = 0; i < subscriptions.length; i += BATCH) {
    const batch = subscriptions.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((sub) => sendPush(sub, payload)));
    results.forEach((result, index) => {
      if (result.ok) success += 1;
      else {
        failure += 1;
        if (result.gone) staleEndpoints.push(batch[index].endpoint);
      }
    });
  }

  // Prune expired/unsubscribed endpoints.
  if (staleEndpoints.length) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: { in: staleEndpoints } } })
      .catch(() => {});
  }

  // Mirror into the in-app dashboard notification feed for signed-in subscribers.
  const userIds = Array.from(
    new Set(subscriptions.map((s) => s.userId).filter((v): v is string => Boolean(v))),
  );
  if (userIds.length) {
    await prisma.dashboardNotification
      .createMany({
        data: userIds.map((userId) => ({
          userId,
          title,
          message,
          notificationType: "broadcast",
          actionUrl: url,
        })),
      })
      .catch(() => {});
  }

  await prisma.pushBroadcast
    .update({
      where: { id: broadcast.id },
      data: { successCount: success, failureCount: failure },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    recipientCount: subscriptions.length,
    success,
    failure,
    pruned: staleEndpoints.length,
  });
}
