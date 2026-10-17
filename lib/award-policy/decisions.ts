/**
 * Award decision records required by the Scholarship Award Policy filed with
 * ADOR: the need assessment, the factors applied, at least two reviewers, the
 * committee's approval (with recusals), and appeals. Client-safe and pure.
 */

export type NeedAssessment = {
  householdIncome: number | null;
  householdSize: number | null;
  /** Household income as a percent of the reduced-price lunch limit (185% of poverty). */
  pctOfRplLimit: number | null;
  tuition: number | null;
  /** Other aid this year, including other STOs' scholarships. */
  otherAid: number | null;
  note: string;
};

export const DECISION_FACTORS = [
  { key: "narrative", label: "Student narrative" },
  { key: "returning", label: "Returning student" },
  { key: "sibling", label: "Sibling of a current recipient" },
  { key: "waitingList", label: "On the Overflow waiting list" },
  { key: "donorRecommendation", label: "Donor recommendation (never binding)" },
] as const;
export type DecisionFactorKey = (typeof DECISION_FACTORS)[number]["key"];
export type DecisionFactors = Partial<Record<DecisionFactorKey, boolean>> & { rationale?: string };

export type DecisionReviewer = { name: string; amount: number | null; fundingSource: string };
export type Recusal = { member: string; reason: string };
export type CommitteeApproval = { round: string; meetingDate: string; vote: string; recusals: Recusal[] };
export type Appeal = { requestedOn: string; newInformation: string; decision: string; decidedOn: string };

export type DecisionRecord = {
  needAssessment: NeedAssessment;
  factors: DecisionFactors;
  reviewers: DecisionReviewer[];
  committee: CommitteeApproval;
  appeals: Appeal[];
};

export const APPEAL_WINDOW_DAYS = 30;

const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const isoDay = (v: unknown) => {
  const s = text(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

/** Read a stored or submitted record without trusting it. */
export function normalizeDecision(raw: {
  needAssessment?: unknown;
  factors?: unknown;
  reviewers?: unknown;
  committee?: unknown;
  appeals?: unknown;
}): DecisionRecord {
  const need = (raw.needAssessment && typeof raw.needAssessment === "object" ? raw.needAssessment : {}) as Record<string, unknown>;
  const factors = (raw.factors && typeof raw.factors === "object" ? raw.factors : {}) as Record<string, unknown>;
  const committee = (raw.committee && typeof raw.committee === "object" ? raw.committee : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []) as Record<string, unknown>[];
  return {
    needAssessment: {
      householdIncome: num(need.householdIncome),
      householdSize: num(need.householdSize),
      pctOfRplLimit: num(need.pctOfRplLimit),
      tuition: num(need.tuition),
      otherAid: num(need.otherAid),
      note: text(need.note),
    },
    factors: {
      ...Object.fromEntries(DECISION_FACTORS.map((f) => [f.key, factors[f.key] === true])),
      rationale: text(factors.rationale),
    },
    reviewers: list(raw.reviewers)
      .map((r) => ({ name: text(r.name, 120), amount: num(r.amount), fundingSource: text(r.fundingSource, 60) }))
      .filter((r) => r.name || r.amount !== null)
      .slice(0, 10),
    committee: {
      round: text(committee.round, 120),
      meetingDate: isoDay(committee.meetingDate),
      vote: text(committee.vote, 200),
      recusals: list(committee.recusals)
        .map((r) => ({ member: text(r.member, 120), reason: text(r.reason, 500) }))
        .filter((r) => r.member)
        .slice(0, 20),
    },
    appeals: list(raw.appeals)
      .map((a) => ({
        requestedOn: isoDay(a.requestedOn),
        newInformation: text(a.newInformation),
        decision: text(a.decision, 1000),
        decidedOn: isoDay(a.decidedOn),
      }))
      .filter((a) => a.requestedOn)
      .slice(0, 10),
  };
}

/** Why the committee approval can't be recorded yet, or null. */
export function decisionApprovalError(d: DecisionRecord): string | null {
  const reviewers = d.reviewers.filter((r) => r.name && r.amount !== null && r.fundingSource);
  if (reviewers.length < 2) return "Record at least two reviewers, each with their recommended amount and fund.";
  if (!d.factors.rationale?.trim()) return "Write the rationale for this award.";
  if (!d.committee.round) return "Enter the award round.";
  if (!d.committee.meetingDate) return "Enter the committee meeting date.";
  if (!d.committee.vote) return "Enter the vote result.";
  if (d.committee.recusals.some((r) => !r.reason)) return "Give the reason for every recusal.";
  return null;
}

/** The last day an appeal may be filed: 30 days after the award notice. */
export function appealDeadline(noticeSentAt: string | Date | null | undefined): string | null {
  if (!noticeSentAt) return null;
  const d = new Date(noticeSentAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
