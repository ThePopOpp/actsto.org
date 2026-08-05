import "server-only";

import type { ReviewAction } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isOverflowClaim, isStepId, NEEDS_INFO_DAYS } from "@/lib/scholarship/constants";
import {
  notifyApplicationApproved,
  notifyApplicationDenied,
  notifyApplicationReopened,
  notifyInformationRequested,
} from "@/lib/scholarship/notifications";
import { ScopeError, type StaffActor } from "@/lib/scholarship/scope";
import { getWindowForYear, resolveWindowState } from "@/lib/scholarship/windows";

/**
 * The staff review workflow.
 *
 * Two invariants this file exists to hold:
 *
 *   1. **The ledger is append-only.** Every decision writes an
 *      `application_reviews` row; the application's `status` is just the latest
 *      one. Nothing here ever edits or deletes a prior decision — you will
 *      eventually need to show a parent or an auditor how a determination was
 *      reached.
 *
 *   2. **Only an approval writes `student_year_eligibility`.** A parent's claim
 *      on an application is not eligibility; staff verification during review
 *      is. No other function in this codebase inserts into that table.
 */

export type ReviewInput = {
  applicationId: string;
  action: ReviewAction;
  internalNote?: string | null;
  parentMessage?: string | null;
  fieldsRequested?: string[];
  /** Extend an existing needs-info deadline instead of the default 30 days. */
  dueAt?: Date | null;
  /** approve only: did staff verify the claimed Overflow qualification? */
  overflowVerified?: boolean;
};

async function recipientFor(applicationId: string) {
  const application = await prisma.scholarshipApplication.findUniqueOrThrow({
    where: { id: applicationId },
    select: {
      id: true,
      guardianUserId: true,
      schoolYear: true,
      studentId: true,
      overflowQualification: true,
      esaCurrentYear: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const profile = application.guardianUserId
    ? await prisma.profile.findUnique({
        where: { id: application.guardianUserId },
        select: { id: true, email: true, fullName: true, displayName: true },
      })
    : null;

  return {
    application,
    studentName:
      [application.student.firstName, application.student.lastName].filter(Boolean).join(" ") ||
      "your student",
    recipient: profile
      ? {
          profileId: profile.id,
          email: profile.email,
          name: profile.displayName ?? profile.fullName,
        }
      : null,
  };
}

/** Write the ledger row. Every action goes through here — no exceptions. */
async function writeReview(actor: StaffActor, input: ReviewInput, dueAt: Date | null) {
  if (!actor.profileId) {
    throw new ScopeError(
      "Your staff account isn't linked to a profile, so decisions can't be recorded against it.",
      409,
    );
  }

  return prisma.applicationReview.create({
    data: {
      applicationId: input.applicationId,
      reviewerId: actor.profileId,
      action: input.action,
      // Kept apart at every layer. One combined field guarantees that internal
      // commentary eventually reaches a family.
      internalNote: input.internalNote?.trim() || null,
      parentMessage: input.parentMessage?.trim() || null,
      fieldsRequested: input.fieldsRequested?.filter(isStepId) ?? [],
      dueAt,
    },
  });
}

// ── Claim ────────────────────────────────────────────────────────────────────

/** First claim moves `submitted` → `under_review`, so two reviewers don't collide. */
export async function claimApplication(actor: StaffActor, applicationId: string) {
  const application = await prisma.scholarshipApplication.findUniqueOrThrow({
    where: { id: applicationId },
    select: { status: true, reviewedBy: true },
  });

  if (application.reviewedBy && application.reviewedBy !== actor.profileId) {
    const existing = await prisma.profile.findUnique({
      where: { id: application.reviewedBy },
      select: { displayName: true, fullName: true, email: true },
    });
    throw new ScopeError(
      `${existing?.displayName ?? existing?.fullName ?? existing?.email ?? "Another reviewer"} already has this one.`,
      409,
    );
  }

  await writeReview(actor, { applicationId, action: "claim" }, null);

  return prisma.scholarshipApplication.update({
    where: { id: applicationId },
    data: {
      status: application.status === "submitted" ? "under_review" : undefined,
      reviewedBy: actor.profileId,
      reviewedAt: new Date(),
    },
  });
}

// ── Request more information ─────────────────────────────────────────────────

export async function requestInformation(actor: StaffActor, input: ReviewInput) {
  if (!input.parentMessage?.trim()) {
    throw new ScopeError("Write the family a note explaining what you need.", 400);
  }

  const sections = (input.fieldsRequested ?? []).filter(isStepId);
  const dueAt = input.dueAt ?? addDays(new Date(), NEEDS_INFO_DAYS);

  await writeReview(actor, { ...input, action: "request_info" }, dueAt);

  await prisma.scholarshipApplication.update({
    where: { id: input.applicationId },
    data: {
      status: "needs_info",
      needsInfoDueAt: dueAt,
      fieldsRequested: sections,
      infoNotReceived: false,
    },
  });

  const { studentName, recipient } = await recipientFor(input.applicationId);
  if (recipient) {
    await notifyInformationRequested({
      to: recipient,
      studentName,
      applicationId: input.applicationId,
      parentMessage: input.parentMessage.trim(),
      dueAt,
    });
  }
}

/** Any staff member may extend. Extensions append a row, never edit the old one. */
export async function extendInformationDeadline(
  actor: StaffActor,
  applicationId: string,
  newDueAt: Date,
  internalNote?: string,
) {
  const application = await prisma.scholarshipApplication.findUniqueOrThrow({
    where: { id: applicationId },
    select: { status: true, fieldsRequested: true },
  });
  if (application.status !== "needs_info") {
    throw new ScopeError("There's no open information request to extend.", 409);
  }

  await writeReview(
    actor,
    { applicationId, action: "note", internalNote: internalNote ?? "Deadline extended." },
    newDueAt,
  );

  await prisma.scholarshipApplication.update({
    where: { id: applicationId },
    data: { needsInfoDueAt: newDueAt, infoNotReceived: false },
  });
}

// ── Approve ──────────────────────────────────────────────────────────────────

/**
 * Approval determines **eligibility, not money**.
 *
 * It sets no amount, reserves no funds, and promises nothing. Awarding is a
 * separate downstream process — which is why there is no award column anywhere
 * on this application and nothing here creates one.
 */
export async function approveApplication(actor: StaffActor, input: ReviewInput) {
  const { application, studentName, recipient } = await recipientFor(input.applicationId);

  if (!application.schoolYear) {
    throw new ScopeError("This application has no school year, so eligibility can't be recorded.", 400);
  }

  await writeReview(actor, { ...input, action: "approve" }, null);

  await prisma.scholarshipApplication.update({
    where: { id: input.applicationId },
    data: {
      status: "approved",
      reviewedBy: actor.profileId,
      reviewedAt: new Date(),
      needsInfoDueAt: null,
      fieldsRequested: [],
    },
  });

  // The one place in the system that writes a verified eligibility finding.
  // Keyed to the student and the school year, because several of these
  // qualifications are true once and never again.
  const claimed = isOverflowClaim(application.overflowQualification);
  const verified = claimed && input.overflowVerified === true;

  await prisma.studentYearEligibility.upsert({
    where: {
      studentId_schoolYear: {
        studentId: application.studentId,
        schoolYear: application.schoolYear,
      },
    },
    create: {
      studentId: application.studentId,
      schoolYear: application.schoolYear,
      overflowEligible: verified,
      overflowQualification: verified ? application.overflowQualification : "none",
      verifiedAt: new Date(),
      verifiedBy: actor.profileId!,
      sourceApplicationId: input.applicationId,
    },
    update: {
      overflowEligible: verified,
      overflowQualification: verified ? application.overflowQualification : "none",
      verifiedAt: new Date(),
      verifiedBy: actor.profileId!,
      // An approval on a later attempt records which attempt earned it.
      sourceApplicationId: input.applicationId,
      revokedAt: null,
      revokedReason: null,
      revokedBy: null,
    },
  });

  if (recipient) {
    await notifyApplicationApproved({
      to: recipient,
      studentName,
      schoolYear: application.schoolYear,
      applicationId: input.applicationId,
      // Not "funds released" — a distinct, visible state.
      awardHeldForEsa: application.esaCurrentYear === "yes",
    });
  }
}

// ── Deny ─────────────────────────────────────────────────────────────────────

/**
 * A denial is terminal *for this row*. The family's path forward is a new
 * application, not a revived one.
 */
export async function denyApplication(actor: StaffActor, input: ReviewInput) {
  if (!input.parentMessage?.trim()) {
    // A denial with no explanation generates a phone call every time, which
    // costs staff more than writing the sentence.
    throw new ScopeError("A denial needs a message to the family explaining why.", 400);
  }

  const { application, studentName, recipient } = await recipientFor(input.applicationId);

  await writeReview(actor, { ...input, action: "deny" }, null);

  await prisma.scholarshipApplication.update({
    where: { id: input.applicationId },
    data: {
      status: "denied",
      reviewedBy: actor.profileId,
      reviewedAt: new Date(),
      needsInfoDueAt: null,
      fieldsRequested: [],
    },
  });

  const window = application.schoolYear ? await getWindowForYear(application.schoolYear) : null;
  const windowState = resolveWindowState(window);

  if (recipient) {
    await notifyApplicationDenied({
      to: recipient,
      studentName,
      schoolYear: application.schoolYear ?? "this school year",
      applicationId: input.applicationId,
      parentMessage: input.parentMessage.trim(),
      canReapply: windowState.canSubmit,
      reapplyBy: window?.closesAt ?? null,
    });
  }
}

// ── Reopen ───────────────────────────────────────────────────────────────────

/** Staff unlock a submitted application so the parent can edit it again. */
export async function reopenApplication(actor: StaffActor, input: ReviewInput) {
  await writeReview(actor, { ...input, action: "reopen" }, null);

  await prisma.scholarshipApplication.update({
    where: { id: input.applicationId },
    data: {
      lockedAt: null,
      reopenedBy: actor.profileId,
      reopenedAt: new Date(),
      status: "under_review",
    },
  });

  const { studentName, recipient } = await recipientFor(input.applicationId);
  if (recipient) {
    await notifyApplicationReopened({
      to: recipient,
      studentName,
      applicationId: input.applicationId,
      parentMessage: input.parentMessage?.trim() || null,
    });
  }
}

// ── Note ─────────────────────────────────────────────────────────────────────

export async function addInternalNote(actor: StaffActor, applicationId: string, note: string) {
  if (!note.trim()) throw new ScopeError("Write something first.", 400);
  return writeReview(actor, { applicationId, action: "note", internalNote: note }, null);
}

// ── Eligibility revocation ───────────────────────────────────────────────────

/**
 * Overturning a finding sets `revokedAt` rather than deleting the row.
 * `assertEligible` checks it at award time and again at disbursement.
 */
export async function revokeEligibility(
  actor: StaffActor,
  studentId: string,
  schoolYear: string,
  reason: string,
) {
  if (!reason.trim()) throw new ScopeError("Record why this is being revoked.", 400);

  return prisma.studentYearEligibility.update({
    where: { studentId_schoolYear: { studentId, schoolYear } },
    data: {
      revokedAt: new Date(),
      revokedReason: reason.trim(),
      revokedBy: actor.profileId,
    },
  });
}

// ── Document verification ────────────────────────────────────────────────────

export async function verifyDocument(actor: StaffActor, documentId: string, verified: boolean) {
  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: {
      verifiedAt: verified ? new Date() : null,
      verifiedBy: verified ? actor.profileId : null,
    },
  });
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
