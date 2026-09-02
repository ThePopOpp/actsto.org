import "server-only";

import { prisma } from "@/lib/prisma";
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { emptyCampaignFormValues } from "@/lib/dashboard/campaign-editor";

/**
 * Recalculate a campaign's setup completion from what is currently in the
 * database and store the result.
 *
 * Linking or unlinking a student changes whether the campaign has the student
 * details it needs for review, so any path that touches `campaign_students`
 * calls this rather than leaving a stale percentage on the dashboard.
 */
export async function recomputeCampaignCompletion(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      school: { select: { name: true } },
      campaignStudents: {
        orderBy: { sortOrder: "asc" },
        include: { student: { include: { school: { select: { name: true } } } } },
      },
    },
  });
  if (!campaign) return null;

  const owner = await prisma.profile
    .findUnique({ where: { id: campaign.createdByUserId }, select: { email: true, displayName: true, fullName: true } })
    .catch(() => null);

  const completion = calculateCampaignCompletion({
    ...emptyCampaignFormValues(),
    slug: campaign.slug,
    title: campaign.title ?? "",
    description: campaign.story ?? "",
    tagline: campaign.tagline ?? "",
    excerpt: campaign.shortExcerpt ?? "",
    endDate: campaign.endsAt ? campaign.endsAt.toISOString().slice(0, 10) : "",
    goal: String(campaign.goalAmount ?? 0),
    image: campaign.featuredImageUrl ?? "",
    parentName: owner?.displayName ?? owner?.fullName ?? "",
    parentEmail: owner?.email ?? "",
    schoolName: campaign.school?.name ?? "",
    students: campaign.campaignStudents.map((link) => ({
      id: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName ?? "",
      nickname: link.student.nickname ?? "",
      grade: link.student.grade ?? "",
      school: link.student.school?.name ?? campaign.school?.name ?? "",
      individualGoal: String(link.individualGoal ?? 0),
      photo: link.student.profilePhotoUrl ?? "",
    })),
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { completionPercent: completion.percent, missingFields: completion.missingFields },
  });

  return completion;
}
