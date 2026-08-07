import {
  ParentDashboardContent,
  type ParentDashboardStats,
} from "@/components/dashboard/parent-dashboard-content";
import { getActSession } from "@/lib/auth/session-server";
import { getDashboardCampaignsForSession } from "@/lib/campaigns-source";
import { getCampaignActivity } from "@/lib/dashboard/campaign-activity";
import { getProfileForEmail, managedCampaignWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function countUnreadMessages(profileId: string): Promise<number> {
  const parts = await prisma.conversationParticipant
    .findMany({
      where: { userId: profileId, hidden: false },
      select: { conversationId: true, lastReadAt: true },
    })
    .catch(() => []);
  if (parts.length === 0) return 0;

  return prisma.directMessage
    .count({
      where: {
        deletedAt: null,
        senderId: { not: profileId },
        OR: parts.map((p) => ({
          conversationId: p.conversationId,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        })),
      },
    })
    .catch(() => 0);
}

/** Counts for the overview cards, scoped to the campaigns this parent manages. */
async function loadStats(email: string): Promise<ParentDashboardStats | undefined> {
  const profile = await getProfileForEmail(email);
  if (!profile) return undefined;

  const managed = await prisma.campaign
    .findMany({ where: managedCampaignWhere(profile.id), select: { id: true } })
    .catch(() => []);
  const campaignIds = managed.map((c) => c.id);

  const [messages, pendingReviews, approvedReviews, updates, activity] = await Promise.all([
    // Read state lives on the participant row as `lastReadAt`, not per message,
    // so unread is "sent by someone else, after the last time I looked".
    countUnreadMessages(profile.id),
    campaignIds.length
      ? prisma.review.count({ where: { campaignId: { in: campaignIds }, status: "pending" } }).catch(() => 0)
      : 0,
    campaignIds.length
      ? prisma.review.count({ where: { campaignId: { in: campaignIds }, status: "approved" } }).catch(() => 0)
      : 0,
    campaignIds.length
      ? prisma.campaignUpdate
          .count({ where: { campaignId: { in: campaignIds }, status: "published" } })
          .catch(() => 0)
      : 0,
    getCampaignActivity(campaignIds),
  ]);

  return {
    messages,
    pendingReviews,
    approvedReviews,
    updates,
    visitors7: activity.last7,
    visitorsToday: activity.today,
  };
}

export default async function ParentDashboardPage() {
  const session = await getActSession();
  const [campaigns, stats] = await Promise.all([
    session ? getDashboardCampaignsForSession(session) : [],
    session ? loadStats(session.email) : undefined,
  ]);

  return <ParentDashboardContent campaigns={campaigns} stats={stats} />;
}
