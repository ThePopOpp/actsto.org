import { redirect } from "next/navigation";

import {
  StudentDashboardContent,
  type StudentSupporter,
} from "@/components/dashboard/student-dashboard-content";
import { getActSession } from "@/lib/auth/session-server";
import { getDashboardCampaignsForSession } from "@/lib/campaigns-source";
import { prisma } from "@/lib/prisma";

/** Visible backers on this student's campaign, newest first. */
async function loadSupporters(slug: string): Promise<StudentSupporter[]> {
  const backers = await prisma.campaignBacker
    .findMany({
      where: { campaign: { slug }, status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        displayName: true,
        amount: true,
        isAnonymous: true,
        showAmount: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  return backers.map((backer) => ({
    id: backer.id,
    name: backer.isAnonymous ? "Anonymous" : (backer.displayName ?? "Supporter"),
    amount: backer.showAmount && backer.amount !== null ? Number(backer.amount) : null,
    when: backer.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
}

export default async function StudentDashboardPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/student");

  // The student's own campaign, not a sample one.
  const [campaign] = await getDashboardCampaignsForSession(session);

  return (
    <StudentDashboardContent
      campaign={campaign}
      supporters={campaign ? await loadSupporters(campaign.slug) : []}
    />
  );
}
