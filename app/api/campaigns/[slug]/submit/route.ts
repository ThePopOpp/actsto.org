import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { getEditableCampaignBySlugForSession } from "@/lib/campaigns-source";
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { campaignToFormValues } from "@/lib/dashboard/campaign-editor";
import { prisma } from "@/lib/prisma";

/**
 * Submit an existing campaign for Super Admin review.
 * Any signed-in owner (or admin) can submit once the minimum fields are present.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getActSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to submit your campaign." }, { status: 401 });
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // Owner/admin-scoped load — returns undefined if this session can't edit it.
  const campaign = await getEditableCampaignBySlugForSession(decodedSlug, session);
  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found, or you don't have access to submit it." },
      { status: 404 },
    );
  }

  const completion = calculateCampaignCompletion(campaignToFormValues(campaign));
  if (!completion.readyForReview) {
    return NextResponse.json(
      {
        error: "A few details are still needed before this campaign can be submitted for review.",
        missingFields: completion.missingFields,
      },
      { status: 422 },
    );
  }

  const existing = await prisma.campaign.findUnique({
    where: { slug: campaign.slug },
    select: { id: true, status: true, createdByUserId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Campaign record could not be loaded." }, { status: 404 });
  }

  if (existing.status === "pending_review") {
    return NextResponse.json({ ok: true, status: "pending_review", alreadyPending: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: existing.id },
      data: {
        status: "pending_review",
        completionPercent: completion.percent,
        missingFields: completion.missingFields,
      },
    });

    const pending = await tx.approvalQueue.findFirst({
      where: { entityType: "campaign", entityId: existing.id, status: "pending" },
      select: { id: true },
    });
    if (!pending) {
      await tx.approvalQueue.create({
        data: {
          entityType: "campaign",
          entityId: existing.id,
          submittedBy: existing.createdByUserId,
          status: "pending",
        },
      });
    }
  });

  return NextResponse.json({ ok: true, status: "pending_review" });
}
