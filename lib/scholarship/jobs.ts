import "server-only";

import { prisma } from "@/lib/prisma";
import { DRAFT_REMINDER_DAYS, NEEDS_INFO_REMINDER_DAYS } from "@/lib/scholarship/constants";
import { deleteStorageObjectIfOrphaned, logDocumentAccess } from "@/lib/scholarship/documents";
import { notifyDraftDeadline, notifyInformationReminder } from "@/lib/scholarship/notifications";

/**
 * Scheduled work for the scholarship portal.
 *
 * Four jobs, all idempotent, all safe to run more often than needed:
 *   - needs-info reminders at 14 / 7 / 1 days remaining
 *   - needs-info expiry (back to the queue flagged — never auto-denied)
 *   - draft deadline warnings at 14 / 3 / 0 days before a window closes
 *   - document purge
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

async function guardianFor(guardianUserId: string | null) {
  if (!guardianUserId) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: guardianUserId },
    select: { id: true, email: true, fullName: true, displayName: true },
  });
  if (!profile?.email) return null;
  return {
    profileId: profile.id,
    email: profile.email,
    name: profile.displayName ?? profile.fullName,
  };
}

/**
 * Idempotence: every reminder writes a `dashboard_notifications` row, so we ask
 * whether we already sent this exact one today before sending again. Running
 * the cron twice in an hour must not email a family twice.
 */
async function alreadySentToday(
  profileId: string,
  notificationType: string,
  title: string,
  now: Date,
): Promise<boolean> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.dashboardNotification.findFirst({
    where: {
      userId: profileId,
      notificationType,
      title,
      createdAt: { gte: startOfDay },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

// ── Needs-info reminders ─────────────────────────────────────────────────────

export async function sendNeedsInfoReminders(now = new Date()) {
  const applications = await prisma.scholarshipApplication.findMany({
    where: { status: "needs_info", needsInfoDueAt: { gt: now } },
    select: {
      id: true,
      guardianUserId: true,
      needsInfoDueAt: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });

  let sent = 0;
  for (const application of applications) {
    if (!application.needsInfoDueAt) continue;
    const remaining = daysUntil(application.needsInfoDueAt, now);
    if (!NEEDS_INFO_REMINDER_DAYS.includes(remaining)) continue;

    const recipient = await guardianFor(application.guardianUserId);
    if (!recipient) continue;
    if (await alreadySentToday(recipient.profileId, "scholarship_application", "Application reminder", now)) {
      continue;
    }

    await notifyInformationReminder({
      to: recipient,
      studentName:
        [application.student.firstName, application.student.lastName].filter(Boolean).join(" ") ||
        "your student",
      applicationId: application.id,
      dueAt: application.needsInfoDueAt,
      daysRemaining: remaining,
    });
    sent += 1;
  }
  return { sent, considered: applications.length };
}

// ── Needs-info expiry ────────────────────────────────────────────────────────

/**
 * When the deadline passes with no response, the application goes back to the
 * queue flagged as awaiting-information-not-received — **not** to denied.
 *
 * The most common reason a family misses this window is that the email went to
 * spam or they're dealing with something hard. Software denying them for that
 * is both bad practice and bad pastoral care. A person decides.
 */
export async function expireNeedsInfoRequests(now = new Date()) {
  const overdue = await prisma.scholarshipApplication.findMany({
    where: {
      status: "needs_info",
      needsInfoDueAt: { lt: now },
      infoNotReceived: false,
    },
    select: { id: true, reviewedBy: true },
  });

  for (const application of overdue) {
    // The ledger row needs a reviewer id; the system acts as the last reviewer
    // when nobody claimed it, and is skipped rather than faked otherwise.
    if (application.reviewedBy) {
      await prisma.applicationReview.create({
        data: {
          applicationId: application.id,
          reviewerId: application.reviewedBy,
          action: "expire",
          internalNote:
            "Information request deadline passed with no response. Returned to the queue for a decision — not denied.",
        },
      });
    }

    await prisma.scholarshipApplication.update({
      where: { id: application.id },
      data: {
        status: "under_review",
        infoNotReceived: true,
        needsInfoDueAt: null,
        // `fieldsRequested` is deliberately left in place: the application is
        // back with staff, but a family who replies late can still fill in
        // exactly the sections that were asked for.
      },
    });
  }

  return { expired: overdue.length };
}

// ── Draft deadline warnings ──────────────────────────────────────────────────

export async function sendDraftDeadlineWarnings(now = new Date()) {
  const windows = await prisma.applicationWindow.findMany({
    where: { isPublished: true, opensAt: { lte: now }, closesAt: { gte: now } },
  });

  let sent = 0;
  for (const window of windows) {
    const remaining = daysUntil(window.closesAt, now);
    if (!DRAFT_REMINDER_DAYS.includes(remaining)) continue;

    const drafts = await prisma.scholarshipApplication.findMany({
      where: { status: "draft", schoolYear: window.schoolYear },
      select: {
        id: true,
        guardianUserId: true,
        schoolYear: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });

    for (const draft of drafts) {
      const recipient = await guardianFor(draft.guardianUserId);
      if (!recipient) continue;
      if (
        await alreadySentToday(recipient.profileId, "scholarship_application", "Unfinished application", now)
      ) {
        continue;
      }

      await notifyDraftDeadline({
        to: recipient,
        studentName:
          [draft.student.firstName, draft.student.lastName].filter(Boolean).join(" ") || null,
        schoolYear: draft.schoolYear ?? window.schoolYear,
        applicationId: draft.id,
        closesAt: window.closesAt,
        daysRemaining: remaining,
      });
      sent += 1;
    }
  }

  return { sent };
}

// ── Document purge ───────────────────────────────────────────────────────────

/**
 * Delete the storage object, set `purgedAt`, keep the row.
 *
 * The row is the audit trail: who verified what, when, based on which kind of
 * document. That outlives the file by design — keep the verification, delete
 * the artifact.
 *
 * Manual cleanup does not happen; automated cleanup does.
 */
export async function purgeExpiredDocuments(now = new Date(), limit = 200) {
  const due = await prisma.applicationDocument.findMany({
    where: { purgedAt: null, purgeAfter: { lte: now } },
    take: limit,
    select: { id: true, storagePath: true, fileName: true },
  });

  let purged = 0;
  const failures: string[] = [];

  for (const document of due) {
    const result = await deleteStorageObjectIfOrphaned(document.storagePath, document.id);
    if (result.error) {
      // Do not mark it purged if the object is still there — the next run
      // retries rather than leaving a file behind with a row that claims
      // otherwise.
      failures.push(`${document.fileName}: ${result.error}`);
      continue;
    }

    await prisma.applicationDocument.update({
      where: { id: document.id },
      data: { purgedAt: now },
    });
    await logDocumentAccess({ documentId: document.id, action: "purge" });
    purged += 1;
  }

  if (failures.length > 0) {
    console.error("[scholarship] document purge failures", failures);
  }

  return { purged, considered: due.length, failures: failures.length };
}
