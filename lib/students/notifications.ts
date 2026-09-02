import "server-only";

import { prisma } from "@/lib/prisma";

export const STUDENT_GUIDE_URL = "/dashboard/parent/students/guide";

const UNLINKED_STUDENT_TYPE = "student_not_on_campaign";

/**
 * Create a dashboard notification once and only once for a given key.
 *
 * `notification_type` carries the key so a repeat call — a second campaign
 * save, a page refresh, a retried request — recognises the earlier notice
 * instead of stacking another copy in the parent's bell menu.
 */
async function notifyOnce({
  userId,
  key,
  title,
  message,
  actionUrl,
}: {
  userId: string;
  key: string;
  title: string;
  message: string;
  actionUrl: string;
}) {
  const existing = await prisma.dashboardNotification
    .findFirst({ where: { userId, notificationType: key }, select: { id: true } })
    .catch(() => null);
  if (existing) return null;

  return prisma.dashboardNotification
    .create({ data: { userId, title, message, notificationType: key, actionUrl } })
    .catch(() => null);
}

/**
 * Tell a parent when one of their children is not on any campaign yet.
 *
 * Families routinely add a second child and then never connect them, because
 * nothing in the app said connecting was possible. One notice per student —
 * keyed by the student id — points them at the walkthrough rather than nagging
 * on every save.
 */
export async function notifyStudentsMissingFromCampaigns(userId: string) {
  const [campaignCount, unlinked] = await Promise.all([
    prisma.campaign.count({ where: { createdByUserId: userId } }).catch(() => 0),
    prisma.student
      .findMany({
        where: {
          OR: [{ parentUserId: userId }, { guardians: { some: { guardianUserId: userId } } }],
          campaignStudents: { none: {} },
        },
        select: { id: true, firstName: true, lastName: true },
      })
      .catch(() => []),
  ]);

  // Before the family has a campaign there is nothing to join, and the campaign
  // wizard already prompts for students — a notice then would just be noise.
  if (campaignCount === 0 || unlinked.length === 0) return;

  for (const student of unlinked) {
    const name = [student.firstName, student.lastName].filter(Boolean).join(" ") || "Your student";
    await notifyOnce({
      userId,
      key: `${UNLINKED_STUDENT_TYPE}:${student.id}`,
      title: `Add ${student.firstName} to a campaign`,
      message: `${name} is on your account but is not on any campaign yet. You can add them to a campaign you already run, or start a second campaign just for them — the step-by-step guide shows both.`,
      actionUrl: STUDENT_GUIDE_URL,
    });
  }
}
