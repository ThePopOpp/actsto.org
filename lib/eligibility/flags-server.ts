import "server-only";

import type { Prisma } from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/audit";
import {
  DISPLACED_SCOPE,
  type EligibilityFlag,
  type FlagStatus,
} from "@/lib/eligibility/flags";
import {
  calculateLowIncome,
  readIncomeRows,
  type IncomeTable,
  type LowIncomeCalculation,
} from "@/lib/eligibility/income-table";
import { prisma } from "@/lib/prisma";
import { readIncomeSnapshot } from "@/lib/scholarship/income";

export type FlagActor = { id: string | null; email: string | null };

type SetFlagInput = {
  studentId: string;
  flag: EligibilityFlag;
  /** Ignored for displaced, which is always the K-12 scope. */
  schoolYear: string;
  status: FlagStatus;
  source: "application" | "verification" | "admin_override";
  actor: FlagActor;
  reason?: string | null;
  details?: Record<string, unknown>;
  sourceApplicationId?: string | null;
  verificationId?: string | null;
  documentId?: string | null;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/**
 * The one writer for eligibility flags. Every change appends a history event
 * with who, when, from what and why, and an admin override must give a reason.
 */
export async function setFlag(input: SetFlagInput) {
  if (input.source === "admin_override" && !input.reason?.trim()) {
    throw new Error("An override needs a reason.");
  }
  const schoolYear = input.flag === "displaced" ? DISPLACED_SCOPE : input.schoolYear;
  const decided = input.status === "approved" || input.status === "denied" || input.status === "revoked";

  const existing = await prisma.studentEligibilityFlag.findUnique({
    where: { studentId_flag_schoolYear: { studentId: input.studentId, flag: input.flag, schoolYear } },
  });

  const data = {
    status: input.status,
    source: input.source,
    reason: input.reason?.trim() || null,
    details: toJson(input.details ?? existing?.details ?? {}),
    ...(input.sourceApplicationId !== undefined ? { sourceApplicationId: input.sourceApplicationId } : {}),
    ...(input.verificationId !== undefined ? { verificationId: input.verificationId } : {}),
    ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
    decidedBy: decided ? input.actor.id : null,
    decidedAt: decided ? new Date() : null,
  };

  const flag = existing
    ? await prisma.studentEligibilityFlag.update({ where: { id: existing.id }, data })
    : await prisma.studentEligibilityFlag.create({
        data: { studentId: input.studentId, flag: input.flag, schoolYear, ...data },
      });

  if (!existing || existing.status !== input.status || input.source === "admin_override") {
    await prisma.studentEligibilityFlagEvent.create({
      data: {
        flagId: flag.id,
        fromStatus: existing?.status ?? null,
        toStatus: input.status,
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        reason: input.reason?.trim() || null,
        details: toJson(input.details ?? {}),
      },
    });
  }

  if (input.source === "admin_override") {
    await logAdminActivity({
      actorId: input.actor.id,
      actorEmail: input.actor.email,
      action: "eligibility_flag.override",
      entityType: "student_eligibility_flag",
      entityId: flag.id,
      before: existing ? { status: existing.status } : null,
      after: { flag: input.flag, schoolYear, status: input.status, reason: input.reason },
    });
  }
  return flag;
}

// ── Income table ─────────────────────────────────────────────────────────────

export async function getIncomeTable(schoolYear: string): Promise<IncomeTable | null> {
  const row = await prisma.lowIncomeTable.findUnique({ where: { schoolYear } }).catch(() => null);
  if (!row) return null;
  return {
    schoolYear: row.schoolYear,
    rows: readIncomeRows(row.rows),
    additionalBase: Number(row.additionalBase),
    additionalMax: Number(row.additionalMax),
    sourceNote: row.sourceNote,
  };
}

/** The low-income calculation for one application, from its frozen income snapshot. */
export async function lowIncomeCalculationFor(application: {
  schoolYear: string | null;
  incomeSnapshot: unknown;
}): Promise<{ calculation: LowIncomeCalculation | null; problem: string | null }> {
  if (!application.schoolYear) return { calculation: null, problem: "The application has no school year." };
  const snapshot = readIncomeSnapshot(application.incomeSnapshot);
  if (!snapshot) return { calculation: null, problem: "No certified household income on this application yet." };
  const table = await getIncomeTable(application.schoolYear);
  if (!table) {
    return { calculation: null, problem: `No low-income table entered for ${application.schoolYear}.` };
  }
  const householdSize = snapshot.member_count || snapshot.members.length;
  const calculation = calculateLowIncome(table, householdSize, snapshot.annual_total);
  return {
    calculation,
    problem: calculation ? null : `The ${application.schoolYear} table has no limit for a household of ${householdSize}.`,
  };
}

/**
 * Set the low-income flag from an application: denied when the certified income
 * is over the limit, approved only once income proof has been accepted, and
 * pending until then. Re-run on approval and on every income-proof decision.
 */
export async function evaluateLowIncomeFlag(applicationId: string, actor: FlagActor) {
  const application = await prisma.scholarshipApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      studentId: true,
      schoolYear: true,
      status: true,
      incomeSnapshot: true,
      incomeProofStatus: true,
    },
  });
  if (!application?.schoolYear) return null;

  const { calculation, problem } = await lowIncomeCalculationFor(application);
  if (!calculation) return { calculation: null, problem };

  const proofAccepted = application.incomeProofStatus === "accepted";
  const status: FlagStatus = !calculation.qualifies
    ? "denied"
    : proofAccepted && application.status === "approved"
      ? "approved"
      : "pending_review";

  await setFlag({
    studentId: application.studentId,
    flag: "low_income",
    schoolYear: application.schoolYear,
    status,
    source: "application",
    actor,
    sourceApplicationId: application.id,
    reason: !calculation.qualifies
      ? "Household income is above the low-income limit."
      : !proofAccepted
        ? "Waiting for income proof to be accepted."
        : application.status !== "approved"
          ? "Waiting for the application to be approved."
          : null,
    details: { calculation, incomeProofStatus: application.incomeProofStatus },
  });
  return { calculation, problem: null };
}

/** All flags for a set of students, for lists and the allocation tool. */
export async function flagsForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return prisma.studentEligibilityFlag.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: [{ flag: "asc" }, { schoolYear: "desc" }],
  });
}
