import "server-only";

import type { Prisma } from "@prisma/client";

import {
  capCategory,
  ddGradeBand,
  DD_GRADE_BANDS,
  emptyAmounts,
  labelKey,
  rateFor,
  type MatrixRow,
} from "@/lib/award-policy/limits";
import { logAdminActivity } from "@/lib/admin/audit";
import { DISPLACED_SCOPE } from "@/lib/eligibility/flags";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── 90%-of-state-aid matrix ──────────────────────────────────────────────────

const AMOUNT_COLUMN = {
  preschool: "amountPreschool",
  k: "amountK",
  "1_3": "amount1to3",
  "4_8": "amount4to8",
  "9_12": "amount9to12",
} as const;

type StoredRow = Awaited<ReturnType<typeof prisma.ddCapMatrixRow.findMany>>[number];

function toMatrixRow(r: StoredRow): MatrixRow {
  const amounts = emptyAmounts();
  for (const band of DD_GRADE_BANDS) {
    const v = r[AMOUNT_COLUMN[band.value]];
    amounts[band.value] = v === null ? null : Number(v);
  }
  return { rowLabel: r.rowLabel, codes: r.codes, isRegularEducation: r.isRegularEducation, amounts };
}

export async function matrixFor(schoolYear: string): Promise<MatrixRow[]> {
  const rows = await prisma.ddCapMatrixRow.findMany({ where: { schoolYear }, orderBy: [{ sortOrder: "asc" }, { rowLabel: "asc" }] });
  return rows.map(toMatrixRow);
}

export async function matrixYears(): Promise<string[]> {
  const rows = await prisma.ddCapMatrixRow.findMany({ distinct: ["schoolYear"], select: { schoolYear: true } });
  return rows.map((r) => r.schoolYear).sort().reverse();
}

/** The matrix for the latest school year before this one, for the year-over-year comparison. */
export async function priorMatrix(schoolYear: string): Promise<{ schoolYear: string | null; rows: MatrixRow[] }> {
  const prior = (await matrixYears()).find((y) => y < schoolYear) ?? null;
  return { schoolYear: prior, rows: prior ? await matrixFor(prior) : [] };
}

/** Every code used in any year's matrix, so a code we've seen before isn't flagged as new. */
export async function knownMatrixCodes(): Promise<string[]> {
  const rows = await prisma.ddCapMatrixRow.findMany({ select: { codes: true } });
  return Array.from(new Set(rows.flatMap((r) => r.codes)));
}

/** Codes staff confirmed for each ADOR label, reused on the next import. */
export async function codeAliases(): Promise<Map<string, string[]>> {
  const rows = await prisma.ddCapCodeAlias.findMany();
  return new Map(rows.map((r) => [r.labelKey, r.codes]));
}

export type MatrixSource = { fileName: string; mimeType: string; bytes: Uint8Array } | null;

/**
 * Replace a school year's matrix in one step. The old rows stay in the
 * matrix history with the uploaded file; the codes staff set for each label
 * are remembered for next year. Amounts typed in per student before the matrix
 * existed are then cleared for that year (kept in the audit log).
 */
export async function saveMatrix(
  schoolYear: string,
  rows: MatrixRow[],
  actor: { id: string | null; email: string },
  action: "import" | "save",
  opts: { note?: string | null; source?: MatrixSource } = {},
) {
  if (!/^\d{4}\/\d{4}$/.test(schoolYear)) throw new Error("Choose a school year.");
  const before = await matrixFor(schoolYear);
  const legacy = await prisma.studentYearLimit.findMany({
    where: { schoolYear, ddCap: { not: null }, ddCapIsOverride: false },
    select: { id: true, studentId: true, ddCap: true, ddCapReason: true },
  });
  const [, , event] = await prisma.$transaction([
    prisma.ddCapMatrixRow.deleteMany({ where: { schoolYear } }),
    prisma.ddCapMatrixRow.createMany({
      data: rows.map((r, i) => ({
        schoolYear,
        rowLabel: r.rowLabel.trim().slice(0, 300),
        codes: r.codes,
        isRegularEducation: r.isRegularEducation,
        amountPreschool: r.amounts.preschool,
        amountK: r.amounts.k,
        amount1to3: r.amounts["1_3"],
        amount4to8: r.amounts["4_8"],
        amount9to12: r.amounts["9_12"],
        sortOrder: i,
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      })),
    }),
    prisma.ddCapMatrixEvent.create({
      data: {
        schoolYear,
        action,
        before: before as unknown as Prisma.InputJsonValue,
        after: rows as unknown as Prisma.InputJsonValue,
        actorId: actor.id,
        actorEmail: actor.email,
        note: opts.note?.trim() || null,
        sourceFileName: opts.source?.fileName.slice(0, 200) ?? null,
        sourceMimeType: opts.source?.mimeType ?? null,
        sourceFile: opts.source ? Buffer.from(opts.source.bytes) : null,
      },
      select: { id: true },
    }),
    ...rows
      .filter((r) => !r.isRegularEducation)
      .map((r) =>
        prisma.ddCapCodeAlias.upsert({
          where: { labelKey: labelKey(r.rowLabel) },
          create: { labelKey: labelKey(r.rowLabel), rowLabel: r.rowLabel, codes: r.codes, updatedBy: actor.id, updatedByEmail: actor.email },
          update: { rowLabel: r.rowLabel, codes: r.codes, updatedBy: actor.id, updatedByEmail: actor.email },
        }),
      ),
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
  return { eventId: (event as { id: string }).id, replacedLegacyCaps: rows.length ? legacy.length : 0 };
}

export type CapChange = { studentId: string; name: string; before: number | null; after: number | null; problem: string | null };

export async function recordCapChanges(eventId: string, changes: CapChange[]) {
  await prisma.ddCapMatrixEvent.update({ where: { id: eventId }, data: { capChanges: changes as unknown as Prisma.InputJsonValue } });
}

export async function matrixHistory(schoolYear: string) {
  return prisma.ddCapMatrixEvent.findMany({
    where: { schoolYear },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, before: true, after: true, actorEmail: true, note: true, sourceFileName: true, capChanges: true, createdAt: true },
  });
}

export async function matrixSourceFile(eventId: string) {
  return prisma.ddCapMatrixEvent.findUnique({
    where: { id: eventId },
    select: { sourceFile: true, sourceFileName: true, sourceMimeType: true },
  });
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
  /** The matrix row the category matched, as ADOR printed it. */
  matrixRow: string | null;
  /** ADOR's 90%-of-state-aid amount for the category and grade. */
  matrixAmount: number | null;
  /** The cap that applies: the lesser of tuition and the matrix, or the override. */
  cap: number | null;
  source: "override" | "matrix" | "legacy" | null;
  overrideReason: string | null;
  /** A preschool category was dropped at kindergarten: check for an updated MET. */
  needsMetCheck: boolean;
  /** Why no cap can be computed (no rate for the code and band); payments wait. */
  problem: string | null;
};

/**
 * The disabled/displaced cap for one student and year: min(tuition, matrix
 * amount for their SPED category and grade band). Displaced students and 504
 * plans use Regular Education. An override with a reason wins. An amount typed
 * before the matrix existed is shown only until it is loaded.
 */
export async function ddCapFor(
  studentId: string,
  schoolYear: string,
  opts: { grade: string | null; tuition: number | null },
): Promise<DdCapResult> {
  const [limits, verification, displaced, disabledFlag, rows] = await Promise.all([
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
    matrixFor(schoolYear),
  ]);
  const { category, needsMetCheck } = capCategory({
    grade: opts.grade,
    verifiedCategory: verification?.spedCategory,
    verifiedDocumentType: verification?.documentType,
    disabled: Boolean(disabledFlag),
    displaced: displaced?.status === "approved",
  });
  const band = ddGradeBand(opts.grade);
  const matrixLoaded = rows.length > 0;
  const rate = matrixLoaded ? rateFor(rows, category, band) : { amount: null, rowLabel: null, problem: null };
  const base = { matrixLoaded, category, gradeBand: band, matrixRow: rate.rowLabel, matrixAmount: rate.amount, needsMetCheck };

  const withTuition = (n: number | null) => (n === null ? null : opts.tuition === null ? n : Math.min(n, opts.tuition));
  if (limits?.ddCapIsOverride && limits.ddCap !== null) {
    return { ...base, cap: Number(limits.ddCap), source: "override", overrideReason: limits.ddCapReason, problem: null };
  }
  if (matrixLoaded) {
    return {
      ...base,
      cap: withTuition(rate.amount),
      source: rate.amount === null ? null : "matrix",
      overrideReason: null,
      problem: rate.problem,
    };
  }
  return {
    ...base,
    cap: limits?.ddCap != null ? withTuition(Number(limits.ddCap)) : null,
    source: limits?.ddCap != null ? "legacy" : null,
    overrideReason: limits?.ddCapReason ?? null,
    problem: null,
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
