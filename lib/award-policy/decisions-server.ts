import "server-only";

import type { Prisma } from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/audit";
import {
  appealDeadline,
  decisionApprovalError,
  normalizeDecision,
  type DecisionRecord,
  type NeedAssessment,
} from "@/lib/award-policy/decisions";
import { otherStoTotals } from "@/lib/award-policy/limits-server";
import { AllocationError, notifyAwardCreated, studentYearMoney, type AllocationActor } from "@/lib/allocation/server";
import { csvCell } from "@/lib/csv";
import { readIncomeRows } from "@/lib/eligibility/income-table";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import { isoDateInArizona } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

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

/** Today's figures for a decision's need assessment, before staff add their note. */
export async function suggestedNeed(studentId: string, schoolYear: string): Promise<NeedAssessment> {
  const [need, money, other] = await Promise.all([
    householdNeed(studentId, schoolYear),
    studentYearMoney(studentId, schoolYear),
    otherStoTotals(studentId, schoolYear),
  ]);
  return { ...need, tuition: money.tuitionCeiling, otherAid: other.all, note: "" };
}

export type DecisionView = DecisionRecord & {
  id: string;
  studentId: string;
  schoolYear: string | null;
  approvedAt: string | null;
  approvedByEmail: string | null;
  noticeSentAt: string | null;
  appealDeadline: string | null;
  lines: { awardId: string; fundingLabel: string; amount: number; campaign: string | null; status: string }[];
  suggestedNeed: NeedAssessment;
};

export async function getDecision(decisionId: string): Promise<DecisionView | null> {
  const d = await prisma.scholarshipAwardDecision.findUnique({
    where: { id: decisionId },
    include: { awards: { include: { campaign: { select: { title: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!d) return null;
  const record = normalizeDecision(d);
  return {
    ...record,
    id: d.id,
    studentId: d.studentId,
    schoolYear: d.schoolYear,
    approvedAt: d.approvedAt?.toISOString() ?? null,
    approvedByEmail: d.approvedByEmail,
    noticeSentAt: d.noticeSentAt?.toISOString() ?? null,
    appealDeadline: appealDeadline(d.noticeSentAt),
    lines: d.awards.map((a) => ({
      awardId: a.id,
      fundingLabel: isFundingSource(a.fundingSource) ? FUNDING_SOURCE_LABEL[a.fundingSource] : a.fundingSource ?? "",
      amount: Number(a.awardAmount),
      campaign: a.campaign?.title ?? (a.drawsFromGeneral ? "General gifts (no campaign)" : null),
      status: a.status,
    })),
    suggestedNeed: d.schoolYear ? await suggestedNeed(d.studentId, d.schoolYear) : record.needAssessment,
  };
}

/**
 * Save a decision record. Need, factors, reviewers and the committee entry are
 * editable until the award is approved; appeals stay editable after.
 */
export async function saveDecision(actor: AllocationActor, decisionId: string, input: Partial<DecisionRecord>) {
  const current = await prisma.scholarshipAwardDecision.findUnique({ where: { id: decisionId } });
  if (!current) throw new AllocationError("Decision record not found.", 404);
  const merged = normalizeDecision({
    needAssessment: input.needAssessment ?? current.needAssessment,
    factors: input.factors ?? current.factors,
    reviewers: input.reviewers ?? current.reviewers,
    committee: input.committee ?? current.committee,
    appeals: input.appeals ?? current.appeals,
  });
  const locked = Boolean(current.approvedAt);
  if (locked && (input.needAssessment || input.factors || input.reviewers || input.committee)) {
    throw new AllocationError("This award is approved. Only appeals can be recorded now.", 409);
  }
  const data: Prisma.ScholarshipAwardDecisionUpdateInput = locked
    ? { appeals: merged.appeals }
    : {
        needAssessment: merged.needAssessment,
        factors: merged.factors,
        reviewers: merged.reviewers,
        committee: merged.committee,
        appeals: merged.appeals,
      };
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

/** Record the committee's approval. The family is sent the award notice, which starts the 30-day appeal window. */
export async function approveDecision(actor: AllocationActor, decisionId: string) {
  const current = await prisma.scholarshipAwardDecision.findUnique({
    where: { id: decisionId },
    include: { awards: { where: { status: { not: "reversed" } }, select: { id: true, awardAmount: true } } },
  });
  if (!current) throw new AllocationError("Decision record not found.", 404);
  if (current.approvedAt) throw new AllocationError("This award is already approved.", 409);
  if (current.awards.length === 0) throw new AllocationError("This award has no active lines.");
  const problem = decisionApprovalError(normalizeDecision(current));
  if (problem) throw new AllocationError(problem, 422);
  const now = new Date();
  await prisma.scholarshipAwardDecision.update({
    where: { id: decisionId },
    data: { approvedAt: now, approvedBy: actor.id, approvedByEmail: actor.email, noticeSentAt: now },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award_decision.approve",
    entityType: "scholarship_award_decision",
    entityId: decisionId,
    after: { committee: current.committee },
  });
  const total = round2(current.awards.reduce((s, a) => s + Number(a.awardAmount), 0));
  await notifyAwardCreated(current.awards[0].id, total);
}

/** Every decision record for a school year, as CSV for the audit. */
export async function decisionsCsv(schoolYear: string): Promise<string> {
  const decisions = await prisma.scholarshipAwardDecision.findMany({
    where: { schoolYear },
    orderBy: { createdAt: "asc" },
    include: {
      awards: { include: { campaign: { select: { title: true } } } },
    },
  });
  const students = await prisma.student.findMany({
    where: { id: { in: decisions.map((d) => d.studentId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameOf = new Map(students.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(" ")]));
  const header = [
    "School year", "Student", "Award lines", "Total awarded", "Household income", "Household size", "% of RPL limit",
    "Tuition", "Other aid", "Need note", "Factors", "Rationale", "Reviewers", "Award round", "Meeting date", "Vote",
    "Recusals", "Approved", "Approved by", "Notice sent", "Appeal deadline", "Appeals",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const d of decisions) {
    const r = normalizeDecision(d);
    const active = d.awards.filter((a) => a.status !== "reversed");
    lines.push(
      [
        d.schoolYear,
        nameOf.get(d.studentId) ?? d.studentId,
        active.map((a) => `${a.campaign?.title ?? (a.drawsFromGeneral ? "General" : "No campaign")} ${Number(a.awardAmount)}`).join("; "),
        round2(active.reduce((s, a) => s + Number(a.awardAmount), 0)),
        r.needAssessment.householdIncome,
        r.needAssessment.householdSize,
        r.needAssessment.pctOfRplLimit,
        r.needAssessment.tuition,
        r.needAssessment.otherAid,
        r.needAssessment.note,
        Object.entries(r.factors).filter(([k, v]) => k !== "rationale" && v === true).map(([k]) => k).join("; "),
        r.factors.rationale,
        r.reviewers.map((x) => `${x.name}: ${x.amount ?? ""} ${x.fundingSource}`).join("; "),
        r.committee.round,
        r.committee.meetingDate,
        r.committee.vote,
        r.committee.recusals.map((x) => `${x.member} (${x.reason})`).join("; "),
        d.approvedAt ? isoDateInArizona(d.approvedAt) : "",
        d.approvedByEmail,
        d.noticeSentAt ? isoDateInArizona(d.noticeSentAt) : "",
        appealDeadline(d.noticeSentAt),
        r.appeals.map((a) => `${a.requestedOn}: ${a.decision || "pending"}${a.decidedOn ? ` (${a.decidedOn})` : ""}`).join("; "),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}
