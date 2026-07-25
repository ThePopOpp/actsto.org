import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export type AdminCampaign = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  status: string;
  isFeatured: boolean;
  isPublic: boolean;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  city: string | null;
  state: string | null;
  featuredImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const campaigns = await prisma.campaign.findMany({
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true, title: true, slug: true, tagline: true, status: true, isFeatured: true, isPublic: true,
      goalAmount: true, raisedAmount: true, donorCount: true, city: true, state: true, featuredImageUrl: true,
      startsAt: true, endsAt: true, submittedAt: true, createdAt: true, createdByUserId: true,
    },
  });

  const ownerIds = [...new Set(campaigns.map((c) => c.createdByUserId))];
  const profiles = ownerIds.length
    ? await prisma.profile.findMany({ where: { id: { in: ownerIds } }, select: { id: true, email: true, displayName: true, fullName: true } })
    : [];
  const ownerById = new Map(profiles.map((p) => [p.id, p]));

  const rows: AdminCampaign[] = campaigns.map((c) => {
    const owner = ownerById.get(c.createdByUserId);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      tagline: c.tagline,
      status: c.status,
      isFeatured: c.isFeatured,
      isPublic: c.isPublic,
      goalAmount: Number(c.goalAmount),
      raisedAmount: Number(c.raisedAmount),
      donorCount: c.donorCount,
      city: c.city,
      state: c.state,
      featuredImageUrl: c.featuredImageUrl,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      submittedAt: c.submittedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      ownerName: owner?.displayName || owner?.fullName || null,
      ownerEmail: owner?.email ?? null,
    };
  });

  return NextResponse.json({ campaigns: rows });
}
