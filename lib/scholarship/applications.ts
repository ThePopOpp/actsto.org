import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { OVERFLOW_SLUGS, schoolYearCode, type ApplicationStepId } from "@/lib/scholarship/constants";
import {
  documentWarnings,
  validateApplication,
  type ValidatableApplication,
  type ValidationIssue,
} from "@/lib/scholarship/validation";
import { purgeAfterFor } from "@/lib/scholarship/documents";
import { listHouseholdMembers } from "@/lib/scholarship/household";
import { buildIncomeSnapshot } from "@/lib/scholarship/income";
import {
  notifyApplicationSubmitted,
  notifyStaffOfLateResponse,
  notifyStaffOfSubmission,
} from "@/lib/scholarship/notifications";
import {
  assertWritable,
  parentStudentWhere,
  requireOwnedApplication,
  ScopeError,
  type ParentActor,
} from "@/lib/scholarship/scope";
import { assertWindowOpenForSubmit, getWindowForYear } from "@/lib/scholarship/windows";

/**
 * Application lifecycle: draft creation, autosave, validation, submission and
 * resubmission after a denial.
 *
 * Everything in this file assumes the caller has already resolved a
 * `ParentActor` through `lib/scholarship/scope.ts`. Ownership is re-checked on
 * every fetch regardless — a route that forgets is a data leak, so the
 * belt-and-braces is deliberate.
 */

// ── Draft creation ───────────────────────────────────────────────────────────

export async function getOrCreateDraft(
  parent: ParentActor,
  args: { studentId: string; schoolYear: string },
) {
  const student = await prisma.student.findFirst({
    where: { id: args.studentId, ...parentStudentWhere(parent.profileId) },
    select: { id: true, schoolId: true, grade: true },
  });
  if (!student) throw new ScopeError("That student isn't on your account.", 404);

  const existing = await prisma.scholarshipApplication.findFirst({
    where: {
      studentId: student.id,
      schoolYear: args.schoolYear,
      status: { notIn: ["denied", "withdrawn"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    // A live application already exists for this student-year. It may belong to
    // a co-guardian; ownership is verified before it is handed back.
    return requireOwnedApplication(existing.id, parent.profileId);
  }

  const window = await getWindowForYear(args.schoolYear);

  const created = await prisma.scholarshipApplication.create({
    data: {
      studentId: student.id,
      guardianUserId: parent.profileId,
      schoolYear: args.schoolYear,
      schoolId: student.schoolId,
      grade: student.grade,
      windowId: window?.id ?? null,
      status: "draft",
    },
  });

  return requireOwnedApplication(created.id, parent.profileId);
}

// ── Autosave ─────────────────────────────────────────────────────────────────

type ApplicationPatch = {
  studentId?: string;
  schoolYear?: string;
  schoolId?: string | null;
  schoolNameOther?: string | null;
  grade?: string | null;
  tuitionAfterDiscounts?: number | null;
  narrative?: string;
  overflowQualification?: string;
  overflowOrg?: string | null;
  overflowComments?: string | null;
  esaCurrentYear?: string | null;
  esaPriorYear?: string | null;
};

/** Which step owns which fields — used to enforce partial reopening. */
const FIELD_SECTION: Record<keyof ApplicationPatch, ApplicationStepId> = {
  studentId: "family",
  schoolYear: "family",
  schoolId: "family",
  schoolNameOther: "family",
  grade: "family",
  tuitionAfterDiscounts: "family",
  narrative: "narrative",
  overflowQualification: "overflow",
  overflowOrg: "overflow",
  overflowComments: "overflow",
  esaCurrentYear: "esa",
  esaPriorYear: "esa",
};

export function parseApplicationPatch(
  body: unknown,
): { ok: true; value: ApplicationPatch } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Nothing to save." };
  const raw = body as Record<string, unknown>;
  const patch: ApplicationPatch = {};

  if ("studentId" in raw) {
    if (typeof raw.studentId !== "string" || !raw.studentId) {
      return { ok: false, error: "Choose a student." };
    }
    patch.studentId = raw.studentId;
  }
  if ("schoolYear" in raw) {
    if (typeof raw.schoolYear !== "string" || !/^\d{4}\/\d{4}$/.test(raw.schoolYear)) {
      return { ok: false, error: "Choose a school year." };
    }
    patch.schoolYear = raw.schoolYear;
  }
  if ("schoolId" in raw) {
    patch.schoolId = typeof raw.schoolId === "string" && raw.schoolId ? raw.schoolId : null;
  }
  if ("schoolNameOther" in raw) {
    patch.schoolNameOther =
      typeof raw.schoolNameOther === "string" && raw.schoolNameOther.trim()
        ? raw.schoolNameOther.trim().slice(0, 160)
        : null;
  }
  if ("grade" in raw) {
    patch.grade = typeof raw.grade === "string" && raw.grade ? raw.grade.slice(0, 40) : null;
  }
  if ("tuitionAfterDiscounts" in raw) {
    const value = raw.tuitionAfterDiscounts;
    if (value === null || value === "") {
      patch.tuitionAfterDiscounts = null;
    } else {
      const num = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
      if (!Number.isFinite(num) || num < 0) {
        return { ok: false, error: "Enter the tuition amount as a number." };
      }
      if (num > 99_999_999) return { ok: false, error: "That tuition amount is too large." };
      patch.tuitionAfterDiscounts = Math.round(num * 100) / 100;
    }
  }
  if ("narrative" in raw) {
    if (typeof raw.narrative !== "string") return { ok: false, error: "Narrative must be text." };
    // Warn, don't truncate — but a hard ceiling stops a paste bomb.
    patch.narrative = raw.narrative.slice(0, 20000);
  }
  if ("overflowQualification" in raw) {
    if (typeof raw.overflowQualification !== "string" || !OVERFLOW_SLUGS.includes(raw.overflowQualification)) {
      return { ok: false, error: "Choose one of the listed qualifications." };
    }
    patch.overflowQualification = raw.overflowQualification;
  }
  if ("overflowOrg" in raw) {
    patch.overflowOrg =
      typeof raw.overflowOrg === "string" && raw.overflowOrg ? raw.overflowOrg.slice(0, 160) : null;
  }
  if ("overflowComments" in raw) {
    patch.overflowComments =
      typeof raw.overflowComments === "string" && raw.overflowComments
        ? raw.overflowComments.slice(0, 4000)
        : null;
  }
  if ("esaCurrentYear" in raw) {
    const value = raw.esaCurrentYear;
    if (value !== null && value !== "" && !["yes", "no", "unsure"].includes(String(value))) {
      return { ok: false, error: "Pick an answer to continue." };
    }
    patch.esaCurrentYear = value ? String(value) : null;
  }
  if ("esaPriorYear" in raw) {
    const value = raw.esaPriorYear;
    if (value !== null && value !== "" && !["yes", "no"].includes(String(value))) {
      return { ok: false, error: "Pick an answer to continue." };
    }
    patch.esaPriorYear = value ? String(value) : null;
  }

  return { ok: true, value: patch };
}

export async function patchApplication(
  applicationId: string,
  parent: ParentActor,
  patch: ApplicationPatch,
) {
  const application = await requireOwnedApplication(applicationId, parent.profileId);

  // Every field carries its section, and every section is checked. A locked
  // application, or a needs_info application whose reopened sections don't
  // include this field, is rejected here — not in the UI.
  for (const key of Object.keys(patch) as (keyof ApplicationPatch)[]) {
    assertWritable(application, FIELD_SECTION[key]);
  }

  if (patch.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: patch.studentId, ...parentStudentWhere(parent.profileId) },
      select: { id: true },
    });
    if (!student) throw new ScopeError("That student isn't on your account.", 404);
  }

  if (patch.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: patch.schoolId },
      select: { id: true },
    });
    if (!school) throw new ScopeError("That school wasn't found.", 404);
  }

  const data: Prisma.ScholarshipApplicationUpdateInput = {};
  if (patch.studentId) data.student = { connect: { id: patch.studentId } };
  if (patch.schoolYear !== undefined) data.schoolYear = patch.schoolYear;
  if (patch.schoolId !== undefined) {
    data.school = patch.schoolId ? { connect: { id: patch.schoolId } } : { disconnect: true };
    // Picking a listed school clears any previously typed "Other" name, so the
    // two can never disagree about which school this is.
    if (patch.schoolId) data.schoolNameOther = null;
  }
  if (patch.schoolNameOther !== undefined) data.schoolNameOther = patch.schoolNameOther;
  if (patch.grade !== undefined) data.grade = patch.grade;
  if (patch.tuitionAfterDiscounts !== undefined) {
    data.tuitionAfterDiscounts = patch.tuitionAfterDiscounts;
  }
  if (patch.narrative !== undefined) data.narrative = patch.narrative;
  if (patch.overflowQualification !== undefined) {
    data.overflowQualification = patch.overflowQualification;
    // Clear the dependent fields when the answer moves away from them, so a
    // stale awarding organization can't survive a change of mind.
    if (patch.overflowQualification !== "prior-award") data.overflowOrg = null;
  }
  if (patch.overflowOrg !== undefined) data.overflowOrg = patch.overflowOrg;
  if (patch.overflowComments !== undefined) data.overflowComments = patch.overflowComments;
  if (patch.esaCurrentYear !== undefined) data.esaCurrentYear = patch.esaCurrentYear;
  if (patch.esaPriorYear !== undefined) data.esaPriorYear = patch.esaPriorYear;

  // Moving the school year moves the window the application belongs to.
  if (patch.schoolYear !== undefined) {
    const window = await getWindowForYear(patch.schoolYear);
    data.window = window ? { connect: { id: window.id } } : { disconnect: true };
  }

  if (Object.keys(data).length === 0) return application;

  // A family answering after the deadline lapsed re-flags the application so
  // staff know a late reply arrived rather than leaving it sat as no-response.
  if (application.infoNotReceived) {
    data.infoNotReceived = false;
    await notifyStaffOfLateResponse(applicationId).catch(() => {});
  }

  await prisma.scholarshipApplication.update({ where: { id: applicationId }, data });
  return requireOwnedApplication(applicationId, parent.profileId);
}

// ── Income confirmation ──────────────────────────────────────────────────────

/**
 * The parent affirms the household figures are current for *this* school year.
 *
 * Income carries forward between years, so a returning parent sees last year's
 * numbers already filled in. That's a convenience, not an assertion — and a
 * confirmation from a prior year never satisfies the current one, because this
 * timestamp lives on this year's application row.
 */
export async function confirmIncome(applicationId: string, parent: ParentActor, confirmed: boolean) {
  const application = await requireOwnedApplication(applicationId, parent.profileId);
  assertWritable(application, "financial");

  if (confirmed) {
    const members = await listHouseholdMembers(parent.profileId);
    if (members.length === 0) {
      throw new ScopeError(
        "Add at least one household member before confirming. A member with no income is fine — an empty list isn't.",
        400,
      );
    }
  }

  await prisma.scholarshipApplication.update({
    where: { id: applicationId },
    data: {
      incomeConfirmedAt: confirmed ? new Date() : null,
      incomeConfirmedBy: confirmed ? parent.profileId : null,
    },
  });

  return requireOwnedApplication(applicationId, parent.profileId);
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Normalize a Prisma row into the shape the shared validator expects. The rules
 * themselves live in `lib/scholarship/validation.ts` so the wizard runs exactly
 * the same ones for its inline errors.
 */
function validatable(application: {
  studentId: string | null;
  schoolYear: string | null;
  schoolId: string | null;
  schoolNameOther: string | null;
  grade: string | null;
  tuitionAfterDiscounts: Prisma.Decimal | number | null;
  narrative: string | null;
  incomeConfirmedAt: Date | null;
  overflowQualification: string;
  overflowOrg: string | null;
  esaCurrentYear: string | null;
  esaPriorYear: string | null;
  documents?: { id: string; purgedAt: Date | null }[];
}): ValidatableApplication {
  return {
    ...application,
    tuitionAfterDiscounts:
      application.tuitionAfterDiscounts === null ? null : Number(application.tuitionAfterDiscounts),
  };
}

// ── Confirmation code ────────────────────────────────────────────────────────

/** `ACT-2627-4831`. Retries on the unlikely collision rather than trusting luck. */
async function generateConfirmationCode(schoolYear: string): Promise<string> {
  const prefix = `ACT-${schoolYearCode(schoolYear)}`;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}-${suffix}`;
    const clash = await prisma.scholarshipApplication.findUnique({
      where: { confirmationCode: code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

// ── Submission ───────────────────────────────────────────────────────────────

export type SubmitResult = {
  confirmationCode: string;
  warnings: string[];
};

export async function submitApplication(
  applicationId: string,
  parent: ParentActor,
  certified: boolean,
): Promise<SubmitResult> {
  const application = await requireOwnedApplication(applicationId, parent.profileId);

  // Responding to an information request is a legitimate re-submit, including
  // one that arrives after the deadline lapsed.
  const respondingToRequest =
    application.status === "needs_info" ||
    (application.infoNotReceived && application.fieldsRequested.length > 0);

  if (application.lockedAt && !respondingToRequest) {
    throw new ScopeError("This application has already been submitted.", 409);
  }
  if (application.status === "denied" || application.status === "withdrawn") {
    throw new ScopeError("This application is closed. Start a new one instead.", 409);
  }

  if (!certified) {
    throw new ScopeError("Tick the certification box before submitting.", 400);
  }

  // The window is enforced here, against the row as it stands right now. A
  // wizard left open across the deadline cannot submit.
  const window = await assertWindowOpenForSubmit(application.schoolYear);

  const members = await listHouseholdMembers(parent.profileId);
  const issues = validateApplication(
    validatable({ ...application, documents: application.documents }),
    members.length,
  );
  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  const isResubmission = respondingToRequest;
  const confirmationCode =
    application.confirmationCode ?? (await generateConfirmationCode(application.schoolYear!));
  const now = new Date();

  await prisma.scholarshipApplication.update({
    where: { id: applicationId },
    data: {
      status: isResubmission ? "under_review" : "submitted",
      certifiedAt: now,
      submittedAt: application.submittedAt ?? now,
      confirmationCode,
      lockedAt: now,
      windowId: window.id,
      // A response stops the needs-info clock.
      needsInfoDueAt: null,
      fieldsRequested: [],
      infoNotReceived: false,
      // Freeze the household as certified. The live rows keep changing; this
      // does not.
      incomeSnapshot: buildIncomeSnapshot(members, now) as unknown as Prisma.InputJsonValue,
    },
  });

  const student = await prisma.student.findUnique({
    where: { id: application.studentId },
    select: { firstName: true, lastName: true },
  });
  const studentName = [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "your student";

  await notifyApplicationSubmitted({
    to: { profileId: parent.profileId, email: parent.email, name: parent.name },
    studentName,
    schoolYear: application.schoolYear!,
    confirmationCode,
    applicationId,
    isResubmission,
  });

  await notifyStaffOfSubmission({
    studentName,
    schoolYear: application.schoolYear!,
    applicationId,
    confirmationCode,
    attemptNumber: application.attemptNumber,
    esaHold: application.esaCurrentYear === "yes",
  });

  return {
    confirmationCode,
    warnings: documentWarnings(validatable({ ...application, documents: application.documents })),
  };
}

export class ValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super("This application isn't ready to submit yet.");
    this.name = "ValidationError";
  }
}

// ── Resubmission after a denial ──────────────────────────────────────────────

/**
 * "Apply again" creates a **new** row chained to the denied one.
 *
 * The denied application stays denied forever — never edited, never reopened,
 * never mutated into the new attempt. It is the historical record of a decision.
 */
export async function createResubmission(deniedId: string, parent: ParentActor) {
  const denied = await requireOwnedApplication(deniedId, parent.profileId);
  if (denied.status !== "denied") {
    throw new ScopeError("Only a denied application can be reapplied for.", 409);
  }

  // A denial does not extend a deadline.
  const window = await assertWindowOpenForSubmit(denied.schoolYear);

  const live = await prisma.scholarshipApplication.findFirst({
    where: {
      studentId: denied.studentId,
      schoolYear: denied.schoolYear,
      status: { notIn: ["denied", "withdrawn"] },
    },
    select: { id: true },
  });
  if (live) {
    return requireOwnedApplication(live.id, parent.profileId);
  }

  const created = await prisma.scholarshipApplication.create({
    data: {
      studentId: denied.studentId,
      guardianUserId: parent.profileId,
      schoolYear: denied.schoolYear,
      schoolId: denied.schoolId,
      grade: denied.grade,
      tuitionAfterDiscounts: denied.tuitionAfterDiscounts,
      narrative: denied.narrative,
      overflowQualification: denied.overflowQualification,
      overflowOrg: denied.overflowOrg,
      overflowComments: denied.overflowComments,
      // ESA answers prefill, but the step asks the parent to confirm them.
      esaCurrentYear: denied.esaCurrentYear,
      esaPriorYear: denied.esaPriorYear,
      // Deliberately *not* carried over: a new application is a new
      // certification, and income must be confirmed again for this year.
      incomeConfirmedAt: null,
      incomeConfirmedBy: null,
      certifiedAt: null,
      status: "draft",
      windowId: window.id,
      attemptNumber: denied.attemptNumber + 1,
      supersedesId: denied.id,
    },
  });

  // Documents relink to the same storage object rather than asking the family
  // to re-upload an IEP because of a paperwork outcome.
  const sourceDocs = await prisma.applicationDocument.findMany({
    where: { applicationId: denied.id, purgedAt: null },
  });
  if (sourceDocs.length > 0) {
    await prisma.applicationDocument.createMany({
      data: sourceDocs.map((doc) => ({
        applicationId: created.id,
        storagePath: doc.storagePath,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        documentKind: doc.documentKind,
        uploadedBy: doc.uploadedBy,
        // A fresh retention clock for the new attempt.
        purgeAfter: purgeAfterFor(),
        importedFromId: doc.id,
      })),
    });
  }

  return requireOwnedApplication(created.id, parent.profileId);
}

/** Documents on the denied attempt that were already purged and must be re-supplied. */
export async function purgedDocumentsFrom(deniedApplicationId: string) {
  return prisma.applicationDocument.findMany({
    where: { applicationId: deniedApplicationId, purgedAt: { not: null } },
    select: { fileName: true, documentKind: true },
  });
}
