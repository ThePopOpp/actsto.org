/**
 * Award decision records (award policy, simplified Oct 19, 2026). One person
 * reviews each award with "Mark reviewed", and the committee then approves it
 * as allocated, or it is reversed and reallocated. The amount and fund live on
 * the award, so the record holds only the factors applied, the review, the
 * committee approval (with recusals) and appeals. Client-safe and pure.
 *
 * One record covers one allocation: one student, one fund, one school year,
 * split across one or more campaigns. Two funds are two allocations, each
 * with its own record.
 */

export const DECISION_FACTORS = [
  { key: "financialNeed", label: "Financial need" },
  { key: "narrative", label: "Student narrative" },
  { key: "returning", label: "Returning student" },
  { key: "sibling", label: "Sibling of a current recipient" },
  { key: "waitingList", label: "Waiting list" },
  { key: "donorRecommendation", label: "Donor recommendation" },
] as const;
export type DecisionFactorKey = (typeof DECISION_FACTORS)[number]["key"];
export type DecisionFactors = Record<DecisionFactorKey, boolean> & { rationale: string };

export type Recusal = { member: string; reason: string };
/** The award round is optional; it defaults to the meeting date ("Committee 2026-10-20"). */
export type CommitteeApproval = { round: string; meetingDate: string; vote: string; recusals: Recusal[] };
export type Appeal = { requestedOn: string; newInformation: string; decision: string; decidedOn: string };

export type DecisionRecord = {
  factors: DecisionFactors;
  committee: CommitteeApproval;
  appeals: Appeal[];
};

export type DecisionStage = "awarded" | "reviewed" | "approved";

export const APPEAL_WINDOW_DAYS = 30;

const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isoDay = (v: unknown) => {
  const s = text(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

/** Read a stored or submitted record without trusting it. Financial need is checked unless it was unchecked. */
export function normalizeDecision(raw: { factors?: unknown; committee?: unknown; appeals?: unknown }): DecisionRecord {
  const factors = (raw.factors && typeof raw.factors === "object" ? raw.factors : {}) as Record<string, unknown>;
  const committee = (raw.committee && typeof raw.committee === "object" ? raw.committee : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []) as Record<string, unknown>[];
  return {
    factors: {
      ...(Object.fromEntries(DECISION_FACTORS.map((f) => [f.key, factors[f.key] === true])) as Record<DecisionFactorKey, boolean>),
      financialNeed: factors.financialNeed !== false,
      rationale: text(factors.rationale),
    },
    committee: normalizeCommittee(committee),
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

export function normalizeCommittee(raw: unknown): CommitteeApproval {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const recusals = (Array.isArray(c.recusals) ? c.recusals : []).filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  return {
    round: text(c.round, 120),
    meetingDate: isoDay(c.meetingDate),
    vote: text(c.vote, 200),
    recusals: recusals
      .map((r) => ({ member: text(r.member, 120), reason: text(r.reason, 500) }))
      .filter((r) => r.member)
      .slice(0, 20),
  };
}

/** The award round to store: as entered, else "Committee <meeting date>" so reports still group by meeting. */
export function roundOrDefault(c: CommitteeApproval): string {
  return c.round || (c.meetingDate ? `Committee ${c.meetingDate}` : "");
}

/** Why the committee approval can't be recorded yet, or null. */
export function decisionApprovalError(input: { reviewed: boolean; committee: CommitteeApproval }): string | null {
  if (!input.reviewed) return "Mark the award reviewed first.";
  if (!input.committee.meetingDate) return "Enter the committee meeting date.";
  if (!input.committee.vote) return "Enter the vote result.";
  if (input.committee.recusals.some((r) => !r.reason)) return "Give the reason for every recusal.";
  return null;
}

/** The last day an appeal may be filed: 30 days after the award notice. */
export function appealDeadline(noticeSentAt: string | Date | null | undefined): string | null {
  if (!noticeSentAt) return null;
  const d = new Date(noticeSentAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type AwardCardStatus = "Awarded" | "Reviewed" | "Approved" | "Sent to school" | "Held: active ESA" | "Reversed";

/** One status for an award card, most telling first. */
export function awardCardStatus(input: {
  reversed: boolean;
  stage: DecisionStage;
  awarded: number;
  sent: number;
  esaActive: boolean;
}): AwardCardStatus {
  if (input.reversed) return "Reversed";
  if (input.sent > 0 && input.sent + 0.005 >= input.awarded) return "Sent to school";
  if (input.esaActive) return "Held: active ESA";
  if (input.sent > 0) return "Sent to school";
  if (input.stage === "approved") return "Approved";
  if (input.stage === "reviewed") return "Reviewed";
  return "Awarded";
}
