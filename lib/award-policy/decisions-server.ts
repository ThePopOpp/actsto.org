import "server-only";

import type { Prisma } from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/audit";
import {
  appealDeadline,
  DECISION_FACTORS,
  decisionApprovalError,
  normalizeCommittee,
  normalizeDecision,
  roundOrDefault,
  type Appeal,
  type CommitteeApproval,
  type DecisionFactors,
  type DecisionStage,
} from "@/lib/award-policy/decisions";
import { otherStoTotals } from "@/lib/award-policy/limits-server";
import {
  AllocationError,
  netPaid,
  notifyAwardCreated,
  reverseAward,
  studentYearMoney,
  type AllocationActor,
} from "@/lib/allocation/server";
import { csvCell } from "@/lib/csv";
import { readIncomeRows } from "@/lib/eligibility/income-table";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import { isoDateInArizona } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;
const fundLabel = (s: string | null) => (isFundingSource(s) ? FUNDING_SOURCE_LABEL[s] : s ?? "");

// ── Need assessment: once per student and year ───────────────────────────────

/** The reduced-price lunch limit (185% of poverty) for a household size, from the year's income table. */
export async function rplLimitFor(schoolYear: string, householdSize: number): Promise<number | null> {
  if (!Number.isInteger(householdSize) || householdSize < 1) return null;
  const table = await prisma.lowIncomeTable.findUnique({ where: { schoolYear } }).catch(() => null);
  if (!table) return null;
  const rows = readIncomeRows(table.rows).sort((a, b) => a.householdSize - b.householdSize);
  const exact = rows.find((r) => r.householdSize === householdSize);
  if (exact) return exact.base185;
  const largest = rows[rows.length - 1];
  if (!largest || householdSize < largest.householdSize) return null;
  return largest.base185 + (householdSize - largest.householdSize) * Number(table.additionalBase);
}

/** Household income and size from the application's certified snapshot, and % of the RPL limit. */
export async function householdNeed(studentId: string, schoolYear: string) {
  const application = await prisma.scholarshipApplication.findFirst({
    where: { studentId, schoolYear, status: { notIn: ["draft", "withdrawn"] } },
    orderBy: { createdAt: "desc" },
    select: { incomeSnapshot: true },
  });
  const snapshot = (application?.incomeSnapshot ?? null) as { annual_total?: number; member_count?: number } | null;
  const income = typeof snapshot?.annual_total === "number" ? snapshot.annual_total : null;
  const size = typeof snapshot?.member_count === "number" ? snapshot.member_count : null;
  const limit = size ? await rplLimitFor(schoolYear, size) : null;
  return {
    householdIncome: income,
    householdSize: size,
    pctOfRplLimit: income !== null && limit ? Math.round((income / limit) * 1000) / 10 : null,
  };
}

export type NeedAssessment = {
  householdIncome: number | null;
  householdSize: number | null;
  pctOfRplLimit: number | null;
  /** Tuition after discounts (or staff's figure). */
  tuition: number | null;
  /** Other STOs' scholarships the family reported. */
  otherSto: number;
  otherStoCount: number;
  /** Sent by ACTSTO this year, net of returns. */
  actSent: number;
  /** Tuition less other STOs and ACTSTO's payments; null when tuition is unknown. */
  tuitionRoom: number | null;
};

/** The student's need for the year, read-only, from the application and payments. */
export async function needAssessmentFor(studentId: string, schoolYear: string): Promise<NeedAssessment> {
  const [need, money, other] = await Promise.all([
    householdNeed(studentId, schoolYear),
    studentYearMoney(studentId, schoolYear),
    otherStoTotals(studentId, schoolYear),
  ]);
  return {
    ...need,
    tuition: money.tuitionCeiling,
    otherSto: other.all,
    otherStoCount: other.rows.length,
    actSent: money.sentAllFunds,
    tuitionRoom: money.tuitionCeiling === null ? null : round2(Math.max(0, money.tuitionCeiling - other.all - money.sentAllFunds)),
  };
}

// ── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_KEY = "award_decisions";
export type DecisionSettings = { reviewerMustDifferFromAllocator: boolean };

export async function decisionSettings(): Promise<DecisionSettings> {
  const row = await prisma.adminIntegrationSettings.findUnique({ where: { key: SETTINGS_KEY } }).catch(() => null);
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  return { reviewerMustDifferFromAllocator: payload.reviewerMustDifferFromAllocator === true };
}

export async function saveDecisionSettings(actor: AllocationActor, next: DecisionSettings) {
  const before = await decisionSettings();
  await prisma.adminIntegrationSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, payload: next },
    update: { payload: next },
  });
  await logAdminActivity({ actorId: actor.id, actorEmail: actor.email, action: "award_decision.settings", entityType: "settings", entityId: SETTINGS_KEY, before, after: next });
}

// ── Reading a record ─────────────────────────────────────────────────────────

export type DecisionView = {
  id: string;
  studentId: string;
  schoolYear: string | null;
  factors: DecisionFactors;
  committee: CommitteeApproval;
  appeals: Appeal[];
  stage: DecisionStage;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  approvedAt: string | null;
  approvedByEmail: string | null;
  noticeSentAt: string | null;
  appealDeadline: string | null;
};

type StoredDecision = NonNullable<Awaited<ReturnType<typeof prisma.scholarshipAwardDecision.findUnique>>>;

function stageOf(d: { approvedAt: Date | null; reviewedAt: Date | null }): DecisionStage {
  return d.approvedAt ? "approved" : d.reviewedAt ? "reviewed" : "awarded";
}

function toView(d: StoredDecision): DecisionView {
  const record = normalizeDecision(d);
  return {
    id: d.id,
    studentId: d.studentId,
    schoolYear: d.schoolYear,
    ...record,
    stage: stageOf(d),
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    reviewedById: d.reviewedBy,
    reviewedByName: d.reviewedByName ?? d.reviewedByEmail,
    approvedAt: d.approvedAt?.toISOString() ?? null,
    approvedByEmail: d.approvedByEmail,
    noticeSentAt: d.noticeSentAt?.toISOString() ?? null,
    appealDeadline: appealDeadline(d.noticeSentAt),
  };
}

export async function getDecision(decisionId: string): Promise<DecisionView | null> {
  const d = await prisma.scholarshipAwardDecision.findUnique({ where: { id: decisionId } });
  return d ? toView(d) : null;
}

export async function getDecisions(ids: string[]): Promise<DecisionView[]> {
  if (!ids.length) return [];
  const rows = await prisma.scholarshipAwardDecision.findMany({ where: { id: { in: ids } } });
  return rows.map(toView);
}

async function load(decisionId: string) {
  const d = await prisma.scholarshipAwardDecision.findUnique({
    where: { id: decisionId },
    include: { awards: { select: { id: true, status: true, awardAmount: true, createdBy: true } } },
  });
  if (!d) throw new AllocationError("Decision record not found.", 404);
  return d;
}

// ── Changing a record ────────────────────────────────────────────────────────

/** Save the factors and the committee entry (until approved), or appeals (any time). */
export async function saveDecision(
  actor: AllocationActor,
  decisionId: string,
  input: { factors?: unknown; committee?: unknown; appeals?: unknown },
) {
  const current = await load(decisionId);
  const locked = Boolean(current.approvedAt);
  if (locked && (input.factors !== undefined || input.committee !== undefined)) {
    throw new AllocationError("This award is approved. Only appeals can be recorded now.", 409);
  }
  const merged = normalizeDecision({
    factors: input.factors ?? current.factors,
    committee: input.committee ?? current.committee,
    appeals: input.appeals ?? current.appeals,
  });
  const data: Prisma.ScholarshipAwardDecisionUpdateInput = locked
    ? { appeals: merged.appeals }
    : { factors: merged.factors, committee: merged.committee, appeals: merged.appeals };
  await prisma.scholarshipAwardDecision.update({ where: { id: decisionId }, data });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: locked ? "award_decision.appeal" : "award_decision.save",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    after: data,
  });
}

/** "Mark reviewed": records the signed-in user and the time. One review is required before approval. */
export async function markReviewed(actor: AllocationActor, decisionId: string) {
  const current = await load(decisionId);
  if (current.approvedAt) throw new AllocationError("This award is already approved.", 409);
  if (current.reviewedAt) throw new AllocationError(`Already reviewed by ${current.reviewedByName ?? current.reviewedByEmail ?? "staff"}.`, 409);
  if (!current.awards.some((a) => a.status !== "reversed")) throw new AllocationError("This award was reversed; it needs no review.");
  const settings = await decisionSettings();
  if (settings.reviewerMustDifferFromAllocator && actor.id && current.awards.some((a) => a.createdBy === actor.id)) {
    throw new AllocationError("You allocated this award, and the reviewer must be someone else (Award policy settings).", 403);
  }
  const profile = actor.id
    ? await prisma.profile.findUnique({ where: { id: actor.id }, select: { displayName: true, fullName: true } }).catch(() => null)
    : null;
  const name = profile?.fullName?.trim() || profile?.displayName?.trim() || actor.email;
  const now = new Date();
  await prisma.scholarshipAwardDecision.update({
    where: { id: decisionId },
    data: { reviewedAt: now, reviewedBy: actor.id, reviewedByEmail: actor.email, reviewedByName: name },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award_decision.review",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    after: { reviewedBy: name, reviewedAt: now.toISOString() },
  });
}

/** Undo a review: only the person who reviewed it, and only until the committee approves. */
export async function undoReview(actor: AllocationActor, decisionId: string) {
  const current = await load(decisionId);
  if (current.approvedAt) throw new AllocationError("The committee already approved this award; the review can't be undone.", 409);
  if (!current.reviewedAt) throw new AllocationError("This award hasn't been reviewed.");
  if (!current.reviewedBy || current.reviewedBy !== actor.id) {
    throw new AllocationError("Only the person who reviewed this award can undo the review.", 403);
  }
  await prisma.scholarshipAwardDecision.update({
    where: { id: decisionId },
    data: { reviewedAt: null, reviewedBy: null, reviewedByEmail: null, reviewedByName: null },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award_decision.undo_review",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    before: { reviewedBy: current.reviewedByName, reviewedAt: current.reviewedAt.toISOString() },
  });
}

/**
 * The committee approves the award as allocated. The family is sent the award
 * notice, which starts the 30-day appeal window. A committee that wants a
 * different amount or fund reverses it instead, and staff reallocate.
 */
export async function approveDecision(actor: AllocationActor, decisionId: string, committeeInput?: unknown) {
  const current = await load(decisionId);
  if (current.approvedAt) throw new AllocationError("This award is already approved.", 409);
  const active = current.awards.filter((a) => a.status !== "reversed");
  if (active.length === 0) throw new AllocationError("This award was reversed; there is nothing to approve.");
  const committee = normalizeCommittee(committeeInput ?? current.committee);
  const problem = decisionApprovalError({ reviewed: Boolean(current.reviewedAt), committee });
  if (problem) throw new AllocationError(problem, 422);
  const stored = { ...committee, round: roundOrDefault(committee) };
  const now = new Date();
  await prisma.scholarshipAwardDecision.update({
    where: { id: decisionId },
    data: { committee: stored, approvedAt: now, approvedBy: actor.id, approvedByEmail: actor.email, noticeSentAt: now },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award_decision.approve",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    after: { committee: stored },
  });
  const total = round2(active.reduce((s, a) => s + Number(a.awardAmount), 0));
  await notifyAwardCreated(active[0].id, total);
}

/** Approve several reviewed awards at once with the same meeting date, vote and recusals. */
export async function approveDecisions(actor: AllocationActor, decisionIds: string[], committeeInput: unknown) {
  const committee = normalizeCommittee(committeeInput);
  const problem = decisionApprovalError({ reviewed: true, committee });
  if (problem) throw new AllocationError(problem, 422);
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of Array.from(new Set(decisionIds)).slice(0, 200)) {
    try {
      await approveDecision(actor, id, committee);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error instanceof Error ? error.message : "Not approved." });
    }
  }
  return results;
}

/**
 * The committee doesn't approve the award as allocated: every line of it is
 * reversed, and staff reallocate. Refused while any money is at the school.
 */
export async function reverseDecision(actor: AllocationActor, decisionId: string, reason: string) {
  if (!reason.trim()) throw new AllocationError("Record why the committee is reversing this award.");
  const current = await prisma.scholarshipAwardDecision.findUnique({
    where: { id: decisionId },
    include: {
      awards: {
        where: { status: { not: "reversed" } },
        select: { id: true, payments: { where: { status: "sent" }, select: { amount: true, returnedAmount: true } } },
      },
    },
  });
  if (!current) throw new AllocationError("Decision record not found.", 404);
  if (!current.awards.length) throw new AllocationError("This award is already reversed.");
  if (current.awards.some((a) => a.payments.some((p) => netPaid(p) > 0.005))) {
    throw new AllocationError("Money is at the school against this award. Void the payment or record the school's return first.");
  }
  for (const award of current.awards) await reverseAward(actor, award.id, reason.trim());
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award_decision.reverse",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    after: { reason: reason.trim(), lines: current.awards.map((a) => a.id) },
  });
}

// ── Lists and export ─────────────────────────────────────────────────────────

export type QueuedDecision = {
  id: string;
  studentId: string;
  studentName: string;
  fundingLabel: string;
  total: number;
  campaigns: string[];
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

/** Awards for the year still waiting on the committee (reversed awards never appear). */
export async function decisionQueue(schoolYear: string): Promise<QueuedDecision[]> {
  const rows = await prisma.scholarshipAwardDecision.findMany({
    where: { schoolYear, approvedAt: null, awards: { some: { status: { not: "reversed" } } } },
    orderBy: { createdAt: "asc" },
    include: {
      awards: {
        where: { status: { not: "reversed" } },
        select: { awardAmount: true, fundingSource: true, drawsFromGeneral: true, campaign: { select: { title: true } } },
      },
    },
  });
  const students = await prisma.student.findMany({
    where: { id: { in: rows.map((r) => r.studentId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameOf = new Map(students.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(" ")]));
  return rows.map((d) => ({
    id: d.id,
    studentId: d.studentId,
    studentName: nameOf.get(d.studentId) ?? "Student",
    fundingLabel: fundLabel(d.awards[0]?.fundingSource ?? null),
    total: round2(d.awards.reduce((s, a) => s + Number(a.awardAmount), 0)),
    campaigns: d.awards.map((a) => a.campaign?.title ?? (a.drawsFromGeneral ? "General gifts" : "No campaign")),
    createdAt: d.createdAt.toISOString(),
    reviewedByName: d.reviewedByName ?? d.reviewedByEmail,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
  }));
}

/** Every award line for a school year with its decision, reversed lines included, as CSV for the audit. */
export async function decisionsCsv(schoolYear: string): Promise<string> {
  const awards = await prisma.scholarshipAward.findMany({
    where: { schoolYear, fundingSource: { not: null } },
    orderBy: { createdAt: "asc" },
    include: {
      campaign: { select: { title: true } },
      decision: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });
  const header = [
    "School year", "Student", "Fund", "Campaign", "Amount", "Status", "Reversed on", "Reversed by", "Reversal reason",
    "Factors", "Rationale", "Reviewed by", "Reviewed on", "Award round", "Meeting date", "Vote", "Recusals",
    "Approved on", "Approved by", "Notice sent", "Appeal deadline", "Appeals",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const a of awards) {
    const d = a.decision;
    const r = d ? normalizeDecision(d) : null;
    const status = a.status === "reversed" ? "Reversed" : d?.approvedAt ? "Approved" : d?.reviewedAt ? "Reviewed" : "Awarded";
    lines.push(
      [
        a.schoolYear,
        [a.student.firstName, a.student.lastName].filter(Boolean).join(" "),
        fundLabel(a.fundingSource),
        a.campaign?.title ?? (a.drawsFromGeneral ? "General gifts" : "No campaign"),
        Number(a.awardAmount),
        status,
        a.reversedAt ? isoDateInArizona(a.reversedAt) : "",
        a.reversedByEmail ?? "",
        a.reversalReason ?? "",
        r ? DECISION_FACTORS.filter((f) => r.factors[f.key]).map((f) => f.label).join("; ") : "",
        r?.factors.rationale ?? "",
        d?.reviewedByName ?? d?.reviewedByEmail ?? "",
        d?.reviewedAt ? isoDateInArizona(d.reviewedAt) : "",
        r ? roundOrDefault(r.committee) : "",
        r?.committee.meetingDate ?? "",
        r?.committee.vote ?? "",
        r?.committee.recusals.map((x) => `${x.member} (${x.reason})`).join("; ") ?? "",
        d?.approvedAt ? isoDateInArizona(d.approvedAt) : "",
        d?.approvedByEmail ?? "",
        d?.noticeSentAt ? isoDateInArizona(d.noticeSentAt) : "",
        d ? appealDeadline(d.noticeSentAt) : "",
        r?.appeals.map((x) => `${x.requestedOn}: ${x.decision || "pending"}${x.decidedOn ? ` (${x.decidedOn})` : ""}`).join("; ") ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}
