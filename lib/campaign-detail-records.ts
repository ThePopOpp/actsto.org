import "server-only";

import { prisma } from "@/lib/prisma";
import type { CampaignDetailRecords } from "@/lib/campaign-detail-record-types";

export async function getCampaignDetailRecords(slug: string): Promise<CampaignDetailRecords> {
  const campaign = await prisma.campaign
    .findUnique({
      where: { slug },
      select: {
        campaignUpdates: {
          where: { status: "published" },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            body: true,
            publishedAt: true,
            createdAt: true,
          },
        },
        campaignBackers: {
          where: { status: "visible" },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            displayName: true,
            amount: true,
            message: true,
            isAnonymous: true,
            showAmount: true,
            showMessage: true,
            createdAt: true,
          },
        },
        campaignFaqs: {
          where: { isPublic: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            question: true,
            answer: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!campaign) {
    return { updates: [], donors: [], faqs: [] };
  }

  return {
    updates: campaign.campaignUpdates.map((update) => ({
      id: update.id,
      title: update.title,
      body: update.body,
      publishedAt: (update.publishedAt ?? update.createdAt).toISOString(),
    })),
    donors: campaign.campaignBackers.map((donor) => ({
      id: donor.id,
      displayName: donor.isAnonymous ? "Anonymous donor" : donor.displayName || "Supporter",
      amount: donor.amount == null ? null : Number(donor.amount),
      message: donor.showMessage ? donor.message : null,
      createdAt: donor.createdAt.toISOString(),
      isAnonymous: donor.isAnonymous,
      showAmount: donor.showAmount,
      showMessage: donor.showMessage,
    })),
    faqs: campaign.campaignFaqs,
  };
}
