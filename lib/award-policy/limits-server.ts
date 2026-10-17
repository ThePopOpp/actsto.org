import "server-only";

import { capCategory, ddGradeBand, type MatrixRow } from "@/lib/award-policy/limits";
import { logAdminActivity } from "@/lib/admin/audit";
import { DISPLACED_SCOPE } from "@/lib/eligibility/flags";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── 90%-of-state-aid matrix ──────────────────────────────────────────────────

export async function matrixFor(schoolYear: string) {
  const rows = await prisma.ddCapMatrixRow.findMany({
    where: { schoolYear },
    orderBy: [{ spedCategory: "asc" }, { gradeBand: "asc" }],
  });
  return rows.map((r) => ({ spedCategory: r.spedCategory, gradeBand: r.gradeBand, amount90pct: Number(r.amount90pct) }));
}

export async function matrixYears(): Promise<string[]> {
  const rows = await prisma.ddCapMatrixRow.findMany({ distinct: ["schoolYear"], select: { schoolYear: true } });
  return rows.map((r) => r.schoolYear).sort().reverse();
}

/**
 * Replace a school year's matrix with these rows, keeping the old rows in the
 * matrix history. Amounts typed in per student before the matrix existed are
 * then cleared for that year (kept in the audit log), so every disabled/
 * displaced cap that year comes from the matrix unless staff override it.
 */
export async function saveMatrix(
  schoolYear: string,
  rows: MatrixRow[],
  actor: { id: string | null; email: string },
  action: "import" | "save",
  note?: string | null,
) {
  if (!/^\d{4}\/\d{4}$/.test(schoolYear)) throw new Error("Choose a school year.");
  const before = await matrixFor(schoolYear);
  const legacy = await prisma.studentYearLimit.findMany({
    where: { schoolYear, ddCap: { not: null }, ddCapIsOverride: false },
    select: { id: true, studentId: true, ddCap: true, ddCapReason: true },
  });
  await prisma.$transaction([
    prisma.ddCapMatrixRow.deleteMany({ where: { schoolYear } }),
    prisma.ddCapMatrixRow.createMany({
      data: rows.map((r) => ({
        schoolYear,
        spedCategory: r.spedCategory,
        gradeBand: r.gradeBand,
        amount90pct: r.amount90pct,
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      })),
    }),
    prisma.ddCapMatrixEvent.create({
      data: { schoolYear, action, before, after: rows, actorId: actor.id, actorEmail: actor.email, note: note?.trim() || null },
    }),
    ...(rows.length && legacy.length
      ? [prisma.studentYearLimit.updateMany({ where: { id: { in: legacy.map((l) => l.id) } }, data: { ddCap: null, ddCapReason: null } })]
      : []),
  ]);
  if (rows.length && legacy.length) {
    await logAdminActivity({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "dd_cap.replaced_by_matrix",
      entityType: "student_year_limit",
      before: legacy.map((l) => ({ studentId: l.studentId, ddCap: Number(l.ddCap), reason: l.ddCapReason })),
      after: { schoolYear, note: "Caps now come from the ADOR 90% state aid matrix." },
    });
  }
  return { replacedLegacyCaps: rows.length ? legacy.length : 0 };
}

export async function matrixHistory(schoolYear: string) {
  return prisma.ddCapMatrixEvent.findMany({ where: { schoolYear }, orderBy: { createdAt: "desc" }, take: 50 });
}

// ── A student's limits for a year ────────────────────────────────────────────

export type OtherStoTotals = { all: number; disabledDisplaced: number; rows: { id: string; stoName: string; program: string; amount: number; source: string; note: string | null }[] };

export async function otherStoTotals(studentId: string, schoolYear: string): Promise<OtherStoTotals> {
  const rows = await prisma.otherStoScholarship.findMany({
    where: { studentId, schoolYear },
    orderBy: { createdAt: "asc" },
  });
  const list = rows.map((r) => ({ id: r.id, stoName: r.stoName, program: r.program, amount: Number(r.amount), source: r.source, note: r.note }));
  return {
    all: round2(list.reduce((s, r) => s + r.amount, 0)),
    disabledDisplaced: round2(list.filter((r) => r.program === "disabled_displaced").reduce((s, r) => s + r.amount, 0)),
    rows: list,
  };
}

export async function esaStatusFor(studentId: string, schoolYear: string) {
  return prisma.studentEsaStatus.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } });
}

export type DdCapResult = {
  /** The matrix for this school year has been entered. */
  matrixLoaded: boolean;
  category: string;
  gradeBand: string | null;
  /** ADOR's 90%-of-state-aid amount for the category and grade. */
  matrixAmount: number | null;
  /** The cap that applies: the lesser of tuition and the matrix, or the override. */
  cap: number | null;
  source: "override" | "matrix" | "legacy" | null;
  overrideReason: string | null;
  /** A preschool category was dropped at kindergarten: check for an updated MET. */
  needsMetCheck: boolean;
};

/**
 * The disabled/displaced cap for one student and year: min(tuition, matrix
 * amount for their SPED category and grade). An override with a reason wins.
 * An amount typed before the matrix existed is shown only until it is loaded.
 */
export async function ddCapFor(
  studentId: string,
  schoolYear: string,
  opts: { grade: string | null; tuition: number | null },
): Promise<DdCapResult> {
  const [limits, verification, displaced, disabledFlag, matrixCount] = await Promise.all([
    prisma.studentYearLimit.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } }),
    prisma.studentVerification.findFirst({
      where: { studentId, kind: "disability", status: "approved" },
      orderBy: { decidedAt: "desc" },
      select: { spedCategory: true, documentType: true },
    }),
    prisma.studentEligibilityFlag.findUnique({
      where: { studentId_flag_schoolYear: { studentId, flag: "displaced", schoolYear: DISPLACED_SCOPE } },
      select: { status: true },
    }),
    prisma.studentEligibilityFlag.findFirst({ where: { studentId, flag: "disabled", status: "approved" }, select: { id: true } }),
    prisma.ddCapMatrixRow.count({ where: { schoolYear } }),
  ]);
  const { category, needsMetCheck } = capCategory({
    grade: opts.grade,
    verifiedCategory: verification?.spedCategory,
    verifiedDocumentType: verification?.documentType,
    disabled: Boolean(disabledFlag),
    displaced: displaced?.status === "approved",
  });
  const band = ddGradeBand(opts.grade);
  const matrixRow =
    matrixCount && band
      ? await prisma.ddCapMatrixRow.findUnique({
          where: { schoolYear_spedCategory_gradeBand: { schoolYear, spedCategory: category, gradeBand: band } },
        })
      : null;
  const matrixAmount = matrixRow ? Number(matrixRow.amount90pct) : null;

  const withTuition = (n: number | null) => (n === null ? null : opts.tuition === null ? n : Math.min(n, opts.tuition));
  if (limits?.ddCapIsOverride && limits.ddCap !== null) {
    return {
      matrixLoaded: matrixCount > 0,
      category,
      gradeBand: band,
      matrixAmount,
      cap: Number(limits.ddCap),
      source: "override",
      overrideReason: limits.ddCapReason,
      needsMetCheck,
    };
  }
  if (matrixCount > 0) {
    return {
      matrixLoaded: true,
      category,
      gradeBand: band,
      matrixAmount,
      cap: withTuition(matrixAmount),
      source: matrixAmount === null ? null : "matrix",
      overrideReason: null,
      needsMetCheck,
    };
  }
  return {
    matrixLoaded: false,
    category,
    gradeBand: band,
    matrixAmount: null,
    cap: limits?.ddCap != null ? withTuition(Number(limits.ddCap)) : null,
    source: limits?.ddCap != null ? "legacy" : null,
    overrideReason: limits?.ddCapReason ?? null,
    needsMetCheck,
  };
}

// ── Awards held for an active ESA ────────────────────────────────────────────

export type EsaHeldAward = {
  awardId: string;
  studentId: string;
  studentName: string;
  schoolYear: string;
  fundingSource: string | null;
  campaign: string | null;
  awarded: number;
  unsent: number;
  esaNote: string | null;
};

/** Awards with money still unsent to a student whose ESA is active that year. */
export async function awardsHeldForEsa(schoolYear?: string): Promise<EsaHeldAward[]> {
  const active = await prisma.studentEsaStatus.findMany({
    where: { status: "active", ...(schoolYear ? { schoolYear } : {}) },
    select: { studentId: true, schoolYear: true, note: true },
  });
  if (!active.length) return [];
  const awards = await prisma.scholarshipAward.findMany({
    where: {
      status: { not: "reversed" },
      OR: active.map((a) => ({ studentId: a.studentId, schoolYear: a.schoolYear })),
    },
    orderBy: [{ schoolYear: "desc" }, { createdAt: "asc" }],
    include: {
      student: { select: { firstName: true, lastName: true } },
      campaign: { select: { title: true } },
      payments: { where: { status: "sent" }, select: { amount: true, returnedAmount: true } },
    },
  });
  return awards
    .map((a) => {
      const sent = a.payments.reduce((s, p) => s + Number(p.amount) - Number(p.returnedAmount), 0);
      return {
        awardId: a.id,
        studentId: a.studentId,
        studentName: [a.student.firstName, a.student.lastName].filter(Boolean).join(" "),
        schoolYear: a.schoolYear ?? "",
        fundingSource: a.fundingSource,
        campaign: a.campaign?.title ?? (a.drawsFromGeneral ? "General gifts (no campaign)" : null),
        awarded: Number(a.awardAmount),
        unsent: round2(Number(a.awardAmount) - sent),
        esaNote: active.find((x) => x.studentId === a.studentId && x.schoolYear === a.schoolYear)?.note ?? null,
      };
    })
    .filter((a) => a.unsent > 0.005);
}
