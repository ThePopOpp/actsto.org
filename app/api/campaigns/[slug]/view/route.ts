import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { activityDay, recordCampaignView, visitorHash } from "@/lib/dashboard/campaign-activity";

export const dynamic = "force-dynamic";

/**
 * Count a visit to a campaign page.
 *
 * Called from the browser rather than during render, so prefetches, bots that
 * don't run scripts, and re-renders don't inflate the number. Always answers
 * 204 — a family's page must never break because analytics did.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { slug: decodeURIComponent(slug) },
      select: { id: true },
    });

    if (campaign) {
      const day = activityDay();
      await recordCampaignView(campaign.id, visitorHash(request, day), day);
    }
  } catch (error) {
    console.warn("[campaign-view] could not record a view", error);
  }

  return new NextResponse(null, { status: 204 });
}
