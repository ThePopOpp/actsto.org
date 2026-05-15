import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getProfileForEmail(email: string) {
  return prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      displayName: true,
      fullName: true,
      phone: true,
      isSuperAdmin: true,
    },
  });
}

export function managedCampaignWhere(userId: string): Prisma.CampaignWhereInput {
  return {
    OR: [
      { createdByUserId: userId },
      { campaignStudents: { some: { student: { parentUserId: userId } } } },
      { campaignStudents: { some: { student: { guardians: { some: { guardianUserId: userId } } } } } },
    ],
  };
}

export function managedDonationWhere(userId: string): Prisma.DonationWhereInput {
  const campaign = managedCampaignWhere(userId);

  return {
    OR: [
      { campaign },
      { donationAllocations: { some: { campaign } } },
      { donorRecommendation: { recommendedCampaign: campaign } },
    ],
  };
}

export async function getManagedCampaignRefs(userId: string) {
  return prisma.campaign.findMany({
    where: managedCampaignWhere(userId),
    select: { id: true, slug: true, title: true },
    orderBy: { updatedAt: "desc" },
  });
}
