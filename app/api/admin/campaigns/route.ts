import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export type AdminCampaign = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  shortExcerpt: string | null;
  /** The campaign description ("story"). */
  story: string | null;
  status: string;
  isFeatured: boolean;
  /** Lower shows first among featured campaigns; null is unranked. */
  featuredRank: number | null;
  isSchoolLevel: boolean;
  schoolId: string | null;
  schoolName: string | null;
  isPublic: boolean;
  goalAmount: number;
  /** Paid gifts received through the campaign (counter kept by checkout). */
  raisedAmount: number;
  donorCount: number;
  /** Awarded to the campaign's students from its gifts — the public "funded" figure. */
  awardedAmount: number;
  awardedDonorCount: number;
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
    orderBy: [{ isFeatured: "desc" }, { featuredRank: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    select: {
      id: true, title: true, slug: true, tagline: true, shortExcerpt: true, story: true, status: true, isFeatured: true, isPublic: true,
      featuredRank: true, isSchoolLevel: true, schoolId: true, school: { select: { name: true } },
      awardedAmount: true, awardedDonorCount: true,
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
      shortExcerpt: c.shortExcerpt,
      story: c.story,
      status: c.status,
      isFeatured: c.isFeatured,
      featuredRank: c.featuredRank,
      isSchoolLevel: c.isSchoolLevel,
      schoolId: c.schoolId,
      schoolName: c.school?.name ?? null,
      isPublic: c.isPublic,
      goalAmount: Number(c.goalAmount),
      raisedAmount: Number(c.raisedAmount),
      donorCount: c.donorCount,
      awardedAmount: Number(c.awardedAmount),
      awardedDonorCount: c.awardedDonorCount,
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
