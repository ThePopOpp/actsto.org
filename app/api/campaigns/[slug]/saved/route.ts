import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

async function getProfileIdForSession() {
  const session = await getActSession().catch(() => null);
  if (!session?.email) return { session: null, userId: null };

  const profile = await prisma.profile
    .findFirst({
      where: { email: session.email.toLowerCase() },
      select: { id: true },
    })
    .catch(() => null);

  return { session, userId: profile?.id ?? null };
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const { session, userId } = await getProfileIdForSession();
  if (!session || !userId) {
    return NextResponse.json({ authenticated: false, saved: false });
  }

  const saved = await prisma.savedCampaign
    .findUnique({
      where: { userId_campaignSlug: { userId, campaignSlug: slug } },
      select: { id: true },
    })
    .catch(() => null);

  return NextResponse.json({ authenticated: true, saved: Boolean(saved) });
}

export async function POST(_request: Request, { params }: Params) {
  const { slug } = await params;
  const { session, userId } = await getProfileIdForSession();
  if (!session || !userId) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  await prisma.savedCampaign.upsert({
    where: { userId_campaignSlug: { userId, campaignSlug: slug } },
    create: { userId, campaignSlug: slug },
    update: {},
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { slug } = await params;
  const { session, userId } = await getProfileIdForSession();
  if (!session || !userId) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  await prisma.savedCampaign
    .delete({
      where: { userId_campaignSlug: { userId, campaignSlug: slug } },
    })
    .catch(() => null);

  return NextResponse.json({ saved: false });
}

