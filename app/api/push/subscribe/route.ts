import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { isPushConfigured } from "@/lib/push/web-push";

async function getProfileId(email: string) {
  const profile = await prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// Client bootstrap: tells the browser whether push is available + the VAPID key.
export function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  });
}

type SubscribeBody = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "A valid push subscription is required." }, { status: 400 });
  }

  const session = await getActSession();
  const userId = session ? await getProfileId(session.email) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 400) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userId, userAgent },
    update: { p256dh, auth, userId, userAgent, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required." }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
