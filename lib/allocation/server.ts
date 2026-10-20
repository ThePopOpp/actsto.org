import "server-only";

import { logAdminActivity } from "@/lib/admin/audit";
import {
  disbursementError,
  fundEligibilityError,
  payableRoom,
  tuitionWarning,
  type DisbursementContext,
  type StudentEligibility,
} from "@/lib/allocation/rules";
import { ESA_HOLD_LABEL } from "@/lib/award-policy/limits";
import { ddCapFor, esaStatusFor, otherStoTotals, type DdCapResult } from "@/lib/award-policy/limits-server";
import { DISPLACED_SCOPE } from "@/lib/eligibility/flags";
import { EXCLUDE_ARCHIVED_TESTS } from "@/lib/donors/server";
import {
  FUNDING_SOURCE_LABEL,
  FUNDING_SOURCE_PARENT_LABEL,
  FUNDING_SOURCES,
  isFundingSource,
  type FundingSource,
} from "@/lib/funding-sources";
import { gradeBand, isK12 } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/scholarship/notifications";
import { arizonaDateToInstant, isoDateInArizona } from "@/lib/format-date";

export class AllocationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AllocationError";
  }
}

export type AllocationActor = { id: string | null; email: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a payment left at the school: sent, less anything the school returned. */
export function netPaid(p: { amount: unknown; returnedAmount?: unknown }): number {
  return round2(Number(p.amount) - Number(p.returnedAmount ?? 0));
}

// ── Fund balances ────────────────────────────────────────────────────────────

export type FundBalance = {
  fundingSource: FundingSource;
  label: string;
  received: number;
  /** Backfilled splits an admin hasn't confirmed yet. Counted in received. */
  needsReview: number;
  allocated: number;
  disbursed: number;
  remaining: number;
};

/**
 * Received, allocated, sent and remaining for every fund. Rebuilt from rows
 * every time: received from donation splits on paid donations, allocated from
 * active awards, sent from disbursements not voided. remaining = received −
 * allocated, so the three always reconcile.
 */
export async function fundBalances(): Promise<FundBalance[]> {
  const [splits, awards, payments] = await Promise.all([
    prisma.donationFundSplit.groupBy({
      by: ["fundingSource", "status"],
      where: { donation: { status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] } },
      _sum: { amount: true },
    }),
    prisma.scholarshipAward.groupBy({
      by: ["fundingSource"],
      where: { status: { not: "reversed" }, fundingSource: { not: null } },
      _sum: { awardAmount: true },
    }),
    prisma.scholarshipPayment.findMany({
      where: { status: "sent" },
      select: { amount: true, returnedAmount: true, award: { select: { fundingSource: true } } },
    }),
  ]);

  return FUNDING_SOURCES.map((source) => {
    const received = splits
      .filter((s) => s.fundingSource === source)
      .reduce((sum, s) => sum + Number(s._sum.amount ?? 0), 0);
    const needsReview = splits
      .filter((s) => s.fundingSource === source && s.status === "needs_review")
      .reduce((sum, s) => sum + Number(s._sum.amount ?? 0), 0);
    const allocated = Number(awards.find((a) => a.fundingSource === source)?._sum.awardAmount ?? 0);
    const disbursed = payments
      .filter((p) => p.award.fundingSource === source)
      .reduce((sum, p) => sum + netPaid(p), 0);
    return {
      fundingSource: source,
      label: FUNDING_SOURCE_LABEL[source],
      received: round2(received),
      needsReview: round2(needsReview),
      allocated: round2(allocated),
      disbursed: round2(disbursed),
      remaining: round2(received - allocated),
    };
  });
}

// ── Student eligibility, grade and limits for a year ─────────────────────────

/** The grade the student is in for that school year: the application's, else the record's. */
export async function gradeForYear(studentId: string, schoolYear: string): Promise<string | null> {
  const application = await prisma.scholarshipApplication.findFirst({
    where: { studentId, schoolYear, status: { notIn: ["denied", "withdrawn"] } },
    orderBy: { createdAt: "desc" },
    select: { grade: true },
  });
  if (application?.grade) return application.grade;
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { grade: true } });
  return student?.grade ?? null;
}

export async function studentEligibility(studentId: string, schoolYear: string): Promise<StudentEligibility> {
  const [base, flags, grade] = await Promise.all([
    prisma.studentYearEligibility.findUnique({
      where: { studentId_schoolYear: { studentId, schoolYear } },
    }),
    prisma.studentEligibilityFlag.findMany({
      where: { studentId, status: "approved" },
      select: { flag: true, schoolYear: true },
    }),
    gradeForYear(studentId, schoolYear),
  ]);

  const approvedFor = (flag: string, year = schoolYear) => flags.some((f) => f.flag === flag && f.schoolYear === year);
  const approvedApplication = Boolean(base && !base.revokedAt);
  return {
    approvedApplication,
    overflow: approvedFor("overflow") || Boolean(approvedApplication && base?.overflowEligible),
    low_income: approvedFor("low_income"),
    // Verified once, for every later school year (award policy; ADOR Q143-Q144).
    disabled: flags.some((f) => f.flag === "disabled"),
    // Displaced is verified once for all of K-12, and never applies to preschool.
    displaced: approvedFor("displaced", DISPLACED_SCOPE) && isK12(grade),
  };
}

export type StudentYearMoney = {
  tuitionCeiling: number | null;
  tuitionSource: "override" | "application" | null;
  /** The disabled/displaced cap: min(tuition, 90% state aid), or the override. */
  ddCap: number | null;
  dd: DdCapResult;
  lowIncomeCap: number | null;
  grade: string | null;
  /** Other STOs' scholarships this year (self-reported), all programs and disabled/displaced. */
  otherStoAll: number;
  otherStoDisabledDisplaced: number;
  /** The student's ESA status for the year. */
  esaStatus: "none" | "active" | "closed" | null;
  /** Sent by ACTSTO, net of anything the school returned. */
  sentAllFunds: number;
  sentBySource: Partial<Record<FundingSource, number>>;
  awardedBySource: Partial<Record<FundingSource, number>>;
};

export async function studentYearMoney(studentId: string, schoolYear: string): Promise<StudentYearMoney> {
  const [limits, application, grade, awards, other, esa] = await Promise.all([
    prisma.studentYearLimit.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } }),
    prisma.scholarshipApplication.findFirst({
      where: { studentId, schoolYear, status: { notIn: ["denied", "withdrawn"] } },
      orderBy: { createdAt: "desc" },
      select: { tuitionAfterDiscounts: true },
    }),
    gradeForYear(studentId, schoolYear),
    prisma.scholarshipAward.findMany({
      where: { studentId, schoolYear, status: { not: "reversed" } },
      select: {
        fundingSource: true,
        awardAmount: true,
        payments: { where: { status: "sent" }, select: { amount: true, returnedAmount: true } },
      },
    }),
    otherStoTotals(studentId, schoolYear),
    esaStatusFor(studentId, schoolYear),
  ]);

  const band = gradeBand(grade);
  const cap = band
    ? await prisma.scholarshipCap.findUnique({
        where: {
          fundingSource_schoolYear_gradeBand: { fundingSource: "corporate_low_income", schoolYear, gradeBand: band },
        },
      })
    : null;

  const sentBySource: Partial<Record<FundingSource, number>> = {};
  const awardedBySource: Partial<Record<FundingSource, number>> = {};
  let sentAllFunds = 0;
  for (const award of awards) {
    const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
    const sent = award.payments.reduce((sum, p) => sum + netPaid(p), 0);
    sentAllFunds += sent;
    sentBySource[source] = round2((sentBySource[source] ?? 0) + sent);
    awardedBySource[source] = round2((awardedBySource[source] ?? 0) + Number(award.awardAmount));
  }

  const override = limits?.tuitionCeiling != null ? Number(limits.tuitionCeiling) : null;
  const fromApplication = application?.tuitionAfterDiscounts != null ? Number(application.tuitionAfterDiscounts) : null;
  const tuitionCeiling = override ?? fromApplication;
  const dd = await ddCapFor(studentId, schoolYear, { grade, tuition: tuitionCeiling });
  return {
    tuitionCeiling,
    tuitionSource: override !== null ? "override" : fromApplication !== null ? "application" : null,
    ddCap: dd.cap,
    dd,
    lowIncomeCap: cap ? Number(cap.amount) : null,
    grade,
    otherStoAll: other.all,
    otherStoDisabledDisplaced: other.disabledDisplaced,
    esaStatus: (esa?.status as StudentYearMoney["esaStatus"]) ?? null,
    sentAllFunds: round2(sentAllFunds),
    sentBySource,
    awardedBySource,
  };
}

/**
 * Every disabled or displaced student with an approved application that year,
 * and their disabled/displaced cap now. Taken before and after a state aid
 * matrix is saved, to list the students whose cap changed.
 */
export async function ddCapSnapshot(schoolYear: string): Promise<Map<string, { name: string; cap: number | null; problem: string | null }>> {
  const base = await prisma.studentYearEligibility.findMany({
    where: { schoolYear, revokedAt: null },
    select: { studentId: true, student: { select: { firstName: true, lastName: true } } },
  });
  const out = new Map<string, { name: string; cap: number | null; problem: string | null }>();
  for (const row of base) {
    const eligibility = await studentEligibility(row.studentId, schoolYear);
    if (!eligibility.disabled && !eligibility.displaced) continue;
    const money = await studentYearMoney(row.studentId, schoolYear);
    out.set(row.studentId, {
      name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
      cap: money.ddCap,
      problem: money.dd.problem,
    });
  }
  return out;
}

// ── Candidates for a fund ────────────────────────────────────────────────────

export type AllocationCandidate = {
  studentId: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  grade: string | null;
  eligible: boolean;
  ineligibleReason: string | null;
  esaHold: boolean;
  awardedThisFund: number;
  awardedAllFunds: number;
  sentAllFunds: number;
  tuitionCeiling: number | null;
  /** What could still be sent from this fund under tuition and caps. */
  payableRoomThisFund: number | null;
  recommendedBy: number;
  campaigns: { id: string; title: string }[];
  /** Campaigns whose donors recommended this student (paid gifts). */
  recommendedCampaignIds: string[];
};

/**
 * Students with an approved application for the school year, marked eligible
 * or not for the chosen fund. Ineligible students are returned (with the
 * reason) only when asked, so the default view shows the eligible pool.
 */
export async function allocationCandidates(
  source: FundingSource,
  schoolYear: string,
  opts: { includeIneligible?: boolean; schoolId?: string | null } = {},
): Promise<AllocationCandidate[]> {
  const base = await prisma.studentYearEligibility.findMany({
    where: {
      schoolYear,
      revokedAt: null,
      student: {
        ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
      },
    },
    select: {
      studentId: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          schoolId: true,
          school: { select: { name: true } },
          campaignStudents: { select: { campaign: { select: { id: true, title: true } } } },
          _count: { select: { recommendedIn: true } },
          recommendedIn: {
            where: { donation: { status: "paid", campaignId: { not: null }, AND: [EXCLUDE_ARCHIVED_TESTS] } },
            select: { donation: { select: { campaignId: true } } },
          },
        },
      },
      sourceApplication: { select: { esaCurrentYear: true, school: { select: { id: true, name: true } } } },
    },
  });

  const rows: AllocationCandidate[] = [];
  for (const row of base) {
    const [eligibility, money] = await Promise.all([
      studentEligibility(row.studentId, schoolYear),
      studentYearMoney(row.studentId, schoolYear),
    ]);
    const reason = fundEligibilityError(source, eligibility);
    if (reason && !opts.includeIneligible) continue;

    const awardedThisFund = money.awardedBySource[source] ?? 0;
    const sentThisFund = money.sentBySource[source] ?? 0;
    const room = payableRoom({
      fundingSource: source,
      awardUnsent: Number.POSITIVE_INFINITY,
      sentAllFunds: money.sentAllFunds,
      sentThisFund,
      tuitionCeiling: money.tuitionCeiling,
      lowIncomeCap: money.lowIncomeCap,
      ddCap: money.ddCap,
      otherStoAll: money.otherStoAll,
      otherStoDisabledDisplaced: money.otherStoDisabledDisplaced,
    });

    rows.push({
      studentId: row.studentId,
      name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
      schoolId: row.sourceApplication.school?.id ?? row.student.schoolId,
      schoolName: row.sourceApplication.school?.name ?? row.student.school?.name ?? null,
      grade: money.grade,
      eligible: !reason,
      ineligibleReason: reason,
      // An active ESA holds payment, never the award.
      esaHold: money.esaStatus === "active",
      awardedThisFund,
      awardedAllFunds: round2(Object.values(money.awardedBySource).reduce((s, v) => s + (v ?? 0), 0)),
      sentAllFunds: money.sentAllFunds,
      tuitionCeiling: money.tuitionCeiling,
      payableRoomThisFund: Number.isFinite(room) ? room : null,
      recommendedBy: row.student._count.recommendedIn,
      campaigns: row.student.campaignStudents.map((cs) => cs.campaign),
      recommendedCampaignIds: Array.from(
        new Set(row.student.recommendedIn.map((r) => r.donation.campaignId).filter((id): id is string => Boolean(id))),
      ),
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Awards ───────────────────────────────────────────────────────────────────

// Awards are created in lib/allocation/campaign-funds.ts (createAwardLines):
// every award names the campaign it draws from.

export async function reverseAward(actor: AllocationActor, awardId: string, reason: string) {
  if (!reason.trim()) throw new AllocationError("Record why this award is being reversed.");
  const award = await prisma.scholarshipAward.findUnique({
    where: { id: awardId },
    include: { payments: { where: { status: "sent" }, select: { id: true, amount: true, returnedAmount: true } } },
  });
  if (!award) throw new AllocationError("Award not found.", 404);
  if (award.status === "reversed") throw new AllocationError("This award is already reversed.");
  if (award.payments.some((p) => netPaid(p) > 0.005)) {
    throw new AllocationError(
      "Money is at the school against this award. Void the payment, record the school's return, or release only the unsent part.",
    );
  }
  const updated = await prisma.scholarshipAward.update({
    where: { id: awardId },
    data: { status: "reversed", reversedAt: new Date(), reversedBy: actor.id, reversedByEmail: actor.email, reversalReason: reason.trim() },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award.reverse",
    entityType: "scholarship_award",
    entityId: awardId,
    before: { status: award.status, amount: Number(award.awardAmount) },
    after: { status: "reversed", reason: reason.trim() },
  });
  if (award.campaignId) await recomputeCampaignAwarded(award.campaignId);
  return updated;
}

/** Release an ESA hold once the Department of Education documentation is on file. */
export async function releaseEsaHold(actor: AllocationActor, awardId: string, note: string) {
  if (!note.trim()) {
    throw new AllocationError("Note the documentation that shows the ESA contract closed or lapsed.");
  }
  const award = await prisma.scholarshipAward.findUnique({ where: { id: awardId } });
  if (!award) throw new AllocationError("Award not found.", 404);
  if (award.status !== "held_esa") throw new AllocationError("This award isn't on hold.");
  const updated = await prisma.scholarshipAward.update({
    where: { id: awardId },
    data: { status: "awarded", holdReleasedAt: new Date(), holdReleasedBy: actor.id, holdReleaseNote: note.trim() },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award.release_hold",
    entityType: "scholarship_award",
    entityId: awardId,
    after: { note: note.trim() },
  });
  return updated;
}

// ── Disbursements (money sent to the school) ─────────────────────────────────

export type DisbursementInput = {
  awardId: string;
  amount: number;
  paidAt: string;
  reference?: string | null;
  method?: string | null;
  note?: string | null;
  /** Required when the payment would take all STOs together over tuition. */
  tuitionOverrideReason?: string | null;
};

/** Thrown when a payment needs a reason before it can go ahead (not a refusal). */
export class NeedsReasonError extends AllocationError {
  constructor(message: string) {
    super(message, 409);
    this.name = "NeedsReasonError";
  }
}

/** The context the disbursement rules check, for one award and amount. */
export async function disbursementContext(awardId: string, amount: number): Promise<{ ctx: DisbursementContext; award: { id: string; schoolId: string | null; studentId: string; schoolYear: string } }> {
  const award = await prisma.scholarshipAward.findUnique({
    where: { id: awardId },
    include: {
      payments: { where: { status: "sent" }, select: { amount: true, returnedAmount: true } },
      decision: { select: { approvedAt: true } },
    },
  });
  if (!award || !award.schoolYear) throw new AllocationError("Award not found.", 404);
  const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
  const [eligibility, money] = await Promise.all([
    studentEligibility(award.studentId, award.schoolYear),
    studentYearMoney(award.studentId, award.schoolYear),
  ]);
  const sentOnAward = award.payments.reduce((sum, p) => sum + netPaid(p), 0);
  return {
    award: { id: award.id, schoolId: award.schoolId, studentId: award.studentId, schoolYear: award.schoolYear },
    ctx: {
      amount: round2(amount),
      fundingSource: source,
      awardStatus: award.status,
      schoolYear: award.schoolYear,
      awardUnsent: round2(Number(award.awardAmount) - sentOnAward),
      sentAllFunds: money.sentAllFunds,
      sentThisFund: money.sentBySource[source] ?? 0,
      tuitionCeiling: money.tuitionCeiling,
      otherStoAll: money.otherStoAll,
      otherStoDisabledDisplaced: money.otherStoDisabledDisplaced,
      lowIncomeCap: money.lowIncomeCap,
      ddCap: money.ddCap,
      ddMatrixLoaded: money.dd.matrixLoaded,
      ddProblem: money.dd.problem,
      stillEligible: !fundEligibilityError(source, eligibility),
      esaActive: money.esaStatus === "active",
      committeeApproved: Boolean(award.decision?.approvedAt),
    },
  };
}

export async function recordDisbursement(actor: AllocationActor, input: DisbursementInput) {
  // A typed calendar day, stored as noon Arizona time so it never shifts a day.
  const paidAt = arizonaDateToInstant(String(input.paidAt ?? "").slice(0, 10));
  if (!paidAt) throw new AllocationError("Enter the date the money was sent.");
  const { ctx, award } = await disbursementContext(input.awardId, Number(input.amount));

  const problem = disbursementError(ctx);
  if (problem) throw new AllocationError(problem, 422);
  // Over tuition only once other STOs' self-reported scholarships are counted:
  // a warning. Staff may go ahead with a reason, which is logged.
  const warning = tuitionWarning(ctx);
  const overrideReason = input.tuitionOverrideReason?.trim() || null;
  if (warning && !overrideReason) throw new NeedsReasonError(`${warning} Enter a reason to send it anyway.`);

  const payment = await prisma.scholarshipPayment.create({
    data: {
      awardId: award.id,
      schoolId: award.schoolId,
      amount: ctx.amount,
      paidAt,
      paymentReference: input.reference?.trim() || null,
      paymentMethod: input.method?.trim() || null,
      note: input.note?.trim() || null,
      tuitionOverrideReason: warning ? overrideReason : null,
      status: "sent",
      recordedBy: actor.id,
      recordedByEmail: actor.email,
    },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "disbursement.create",
    entityType: "scholarship_payment",
    entityId: payment.id,
    after: { awardId: award.id, amount: ctx.amount, paidAt: input.paidAt, reference: input.reference, tuitionWarning: warning, overrideReason: warning ? overrideReason : null },
  });
  await notifyAwardChange(award.id, "sent", ctx.amount);
  return payment;
}

/**
 * The school returned money on a payment (a prorated refund or an excess
 * return). It goes back on the award, unsent: it can be paid again for the
 * same student, or released from the award to be reallocated.
 */
export async function recordPaymentReturn(
  actor: AllocationActor,
  paymentId: string,
  input: { amount: number; returnedOn: string; note: string },
) {
  if (!input.note?.trim()) throw new AllocationError("Record why the school returned the money.");
  const payment = await prisma.scholarshipPayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "sent") throw new AllocationError("Payment not found.", 404);
  const amount = round2(Number(input.amount));
  const left = netPaid(payment);
  if (!(amount > 0)) throw new AllocationError("Enter the amount returned.");
  if (amount > left + 0.005) throw new AllocationError(`Only ${left.toLocaleString("en-US", { style: "currency", currency: "USD" })} of this payment is still at the school.`);
  const returnedAt = arizonaDateToInstant(String(input.returnedOn ?? "").slice(0, 10));
  if (!returnedAt) throw new AllocationError("Enter the date the money came back.");
  const updated = await prisma.scholarshipPayment.update({
    where: { id: paymentId },
    data: {
      returnedAmount: round2(Number(payment.returnedAmount) + amount),
      returnedAt,
      returnNote: [payment.returnNote, `${input.returnedOn}: ${amount} (${input.note.trim()})`].filter(Boolean).join("\n"),
    },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "disbursement.return",
    entityType: "scholarship_payment",
    entityId: paymentId,
    before: { returnedAmount: Number(payment.returnedAmount) },
    after: { returnedAmount: Number(updated.returnedAmount), amount, returnedOn: input.returnedOn, note: input.note.trim() },
  });
  return updated;
}

/**
 * Release what is left unsent on an award back to its campaign, so it can be
 * reallocated: the award is reduced to what the school kept.
 */
export async function releaseUnsent(actor: AllocationActor, awardId: string, reason: string) {
  if (!reason.trim()) throw new AllocationError("Record why the rest of this award is being released.");
  const award = await prisma.scholarshipAward.findUnique({
    where: { id: awardId },
    include: { payments: { where: { status: "sent" }, select: { amount: true, returnedAmount: true } } },
  });
  if (!award || award.status === "reversed") throw new AllocationError("Award not found.", 404);
  const kept = round2(award.payments.reduce((s, p) => s + netPaid(p), 0));
  const before = Number(award.awardAmount);
  if (kept >= before - 0.005) throw new AllocationError("Nothing on this award is unsent.");
  if (kept <= 0) throw new AllocationError("Nothing has been sent on this award. Reverse it instead.");
  await prisma.scholarshipAward.update({ where: { id: awardId }, data: { awardAmount: kept } });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award.release_unsent",
    entityType: "scholarship_award",
    entityId: awardId,
    before: { amount: before },
    after: { amount: kept, released: round2(before - kept), reason: reason.trim() },
  });
  if (award.campaignId) await recomputeCampaignAwarded(award.campaignId);
}

export async function voidDisbursement(actor: AllocationActor, paymentId: string, reason: string) {
  if (!reason.trim()) throw new AllocationError("Record why this payment is being voided.");
  const payment = await prisma.scholarshipPayment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AllocationError("Payment not found.", 404);
  if (payment.status === "void") throw new AllocationError("This payment is already void.");
  const updated = await prisma.scholarshipPayment.update({
    where: { id: paymentId },
    data: { status: "void", voidedAt: new Date(), voidedBy: actor.id, voidReason: reason.trim() },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "disbursement.void",
    entityType: "scholarship_payment",
    entityId: paymentId,
    before: { amount: Number(payment.amount), status: payment.status },
    after: { status: "void", reason: reason.trim() },
  });
  return updated;
}

// ── Campaign "funded" (#6) ───────────────────────────────────────────────────

/**
 * Funded = active awards drawn from this campaign's donations to the
 * campaign's own students (or, for a school-level campaign, to students at its
 * school). Donors = distinct donors whose gifts those awards used, taking the
 * campaign's paid gifts oldest first. CampaignStudent.amountAllocated gets each
 * student's share, which is what the parent dashboard's "allocated" shows.
 */
export async function recomputeCampaignAwarded(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      isSchoolLevel: true,
      schoolId: true,
      campaignStudents: { select: { id: true, studentId: true } },
    },
  });
  if (!campaign) return;

  const studentIds = new Set(campaign.campaignStudents.map((cs) => cs.studentId));
  const awards = await prisma.scholarshipAward.findMany({
    where: { campaignId, status: { not: "reversed" } },
    select: { studentId: true, awardAmount: true, schoolId: true, student: { select: { schoolId: true } } },
  });
  const counted = awards.filter((a) =>
    campaign.isSchoolLevel
      ? Boolean(campaign.schoolId) && (a.schoolId === campaign.schoolId || a.student.schoolId === campaign.schoolId)
      : studentIds.has(a.studentId),
  );
  const awarded = round2(counted.reduce((sum, a) => sum + Number(a.awardAmount), 0));

  const donations = await prisma.donation.findMany({
    where: { campaignId, status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] },
    orderBy: { createdAt: "asc" },
    select: { amount: true, totalAmount: true, userId: true, donationDetail: { select: { donorEmail: true } }, id: true },
  });
  let left = awarded;
  const donors = new Set<string>();
  for (const donation of donations) {
    if (left <= 0) break;
    donors.add(donation.userId ?? donation.donationDetail?.donorEmail?.toLowerCase() ?? donation.id);
    left -= Number(donation.totalAmount ?? donation.amount ?? 0);
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { awardedAmount: awarded, awardedDonorCount: donors.size },
  });

  for (const cs of campaign.campaignStudents) {
    const share = round2(counted.filter((a) => a.studentId === cs.studentId).reduce((s, a) => s + Number(a.awardAmount), 0));
    await prisma.campaignStudent.update({ where: { id: cs.id }, data: { amountAllocated: share } });
  }
}

// ── Parent view ──────────────────────────────────────────────────────────────

export type StudentAwardSummary = {
  schoolYear: string;
  awarded: number;
  sent: number;
  remaining: number;
  lines: {
    awardId: string;
    program: string;
    amount: number;
    sent: number;
    status: "Awarded" | "Partially sent to school" | "Fully sent to school" | typeof ESA_HOLD_LABEL;
    payments: { amount: number; date: string }[];
  }[];
};

/** What a parent sees per student and school year: awarded, sent (with dates), remaining. */
export async function studentAwardSummaries(studentId: string): Promise<StudentAwardSummary[]> {
  const awards = await prisma.scholarshipAward.findMany({
    where: { studentId, status: { not: "reversed" }, schoolYear: { not: null } },
    orderBy: { createdAt: "asc" },
    include: { payments: { where: { status: "sent" }, orderBy: { paidAt: "asc" } } },
  });
  const esa = await prisma.studentEsaStatus.findMany({ where: { studentId, status: "active" }, select: { schoolYear: true } });
  const esaActive = new Set(esa.map((e) => e.schoolYear));
  const years = new Map<string, StudentAwardSummary>();
  for (const award of awards) {
    const year = award.schoolYear!;
    const summary = years.get(year) ?? { schoolYear: year, awarded: 0, sent: 0, remaining: 0, lines: [] };
    const amount = Number(award.awardAmount);
    const sent = award.payments.reduce((s, p) => s + netPaid(p), 0);
    const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
    summary.awarded = round2(summary.awarded + amount);
    summary.sent = round2(summary.sent + sent);
    summary.remaining = round2(summary.awarded - summary.sent);
    summary.lines.push({
      awardId: award.id,
      program: FUNDING_SOURCE_PARENT_LABEL[source],
      amount,
      sent: round2(sent),
      status:
        esaActive.has(year) && sent + 0.005 < amount
          ? ESA_HOLD_LABEL
          : sent <= 0
            ? "Awarded"
            : sent + 0.005 >= amount
              ? "Fully sent to school"
              : "Partially sent to school",
      payments: award.payments
        .filter((p) => netPaid(p) > 0)
        .map((p) => ({
          amount: netPaid(p),
          date: isoDateInArizona(p.paidAt ?? p.createdAt),
        })),
    });
    years.set(year, summary);
  }
  return Array.from(years.values()).sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
}

/** Tell the parent about a new award; `total` covers every campaign line of it. */
export async function notifyAwardCreated(awardId: string, total: number) {
  await notifyAwardChange(awardId, "awarded", total);
}

async function notifyAwardChange(awardId: string, kind: "awarded" | "sent", amount?: number) {
  try {
    const award = await prisma.scholarshipAward.findUnique({
      where: { id: awardId },
      select: {
        schoolYear: true,
        status: true,
        awardAmount: true,
        fundingSource: true,
        studentId: true,
        student: { select: { firstName: true, parentUserId: true } },
      },
    });
    if (!award) return;
    const esa = award.schoolYear ? await esaStatusFor(award.studentId, award.schoolYear) : null;
    const parent = await prisma.profile.findUnique({
      where: { id: award.student.parentUserId },
      select: { id: true, email: true, displayName: true, fullName: true },
    });
    if (!parent?.email) return;
    const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
    const program = FUNDING_SOURCE_PARENT_LABEL[source];
    const dollars = `$${Number(amount ?? award.awardAmount).toLocaleString()}`;
    const body =
      kind === "sent"
        ? [`We've sent ${dollars} of ${award.student.firstName}'s ${program.toLowerCase()} to the school for ${award.schoolYear}.`]
        : esa?.status === "active" || award.status === "held_esa"
          ? [
              `${award.student.firstName} has been awarded ${dollars} (${program.toLowerCase()}) for ${award.schoolYear}.`,
              "Because an ESA contract is active for this school year, we can't send the money to the school until the ESA is closed. Send us the ESA closure notice when you have it.",
              "If you'd like to appeal this decision, contact us within 30 days of this notice.",
            ]
          : [
              `${award.student.firstName} has been awarded ${dollars} (${program.toLowerCase()}) for ${award.schoolYear}. We'll let you know when it is sent to the school.`,
              "If you'd like to appeal this decision, contact us within 30 days of this notice.",
            ];
    await notify({
      to: { profileId: parent.id, email: parent.email, name: parent.displayName ?? parent.fullName },
      subject: kind === "sent" ? "Scholarship sent to your school" : "Scholarship awarded",
      body,
      cta: { label: "See your student's scholarships", path: "/dashboard/parent/students" },
      templateKey: kind === "sent" ? "scholarship_disbursed" : "scholarship_awarded",
      dashboardTitle: kind === "sent" ? "Scholarship sent to school" : "Scholarship awarded",
      dashboardType: "scholarship_award",
    });
  } catch (error) {
    console.error("[allocation] parent notification failed", error);
  }
}

// ── Reconciliation and export ────────────────────────────────────────────────

/** One row per award with its payments, for the CSV and ADOR reporting. */
export async function allocationLedger(schoolYear?: string) {
  return prisma.scholarshipAward.findMany({
    where: { fundingSource: { not: null }, ...(schoolYear ? { schoolYear } : {}) },
    orderBy: [{ schoolYear: "desc" }, { createdAt: "asc" }],
    include: {
      student: { select: { firstName: true, lastName: true, grade: true } },
      school: { select: { name: true } },
      campaign: { select: { title: true } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
}
