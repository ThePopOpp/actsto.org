/**
 * Household income maths.
 *
 * Client-safe on purpose: the wizard, the standalone income page, the reviewer
 * UI and any future awarding logic all import `toAnnual` from here, so a parent,
 * a reviewer and the award calculation can never see three different numbers.
 */

export const INCOME_FREQUENCIES = [
  "annually",
  "monthly",
  "semimonthly",
  "biweekly",
  "weekly",
] as const;

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

const MULTIPLIER: Record<IncomeFrequency, number> = {
  annually: 1,
  monthly: 12,
  semimonthly: 24,
  biweekly: 26,
  weekly: 52,
};

export const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  annually: "Annually",
  monthly: "Monthly",
  semimonthly: "Semimonthly",
  biweekly: "Biweekly",
  weekly: "Weekly",
};

/** Short suffix for table cells: "$1,200 / mo". */
export const FREQUENCY_SUFFIX: Record<IncomeFrequency, string> = {
  annually: "/ yr",
  monthly: "/ mo",
  semimonthly: "twice monthly",
  biweekly: "every 2 wks",
  weekly: "/ wk",
};

export function isIncomeFrequency(value: unknown): value is IncomeFrequency {
  return typeof value === "string" && (INCOME_FREQUENCIES as readonly string[]).includes(value);
}

/**
 * The single annualization function. Weekly ×52, biweekly ×26, semimonthly ×24,
 * monthly ×12. Rounded to whole dollars — cents in an annual projection are
 * noise, and rounding once here keeps every total consistent.
 */
export function toAnnual(amount: number, frequency: IncomeFrequency): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * MULTIPLIER[frequency]);
}

export const INCOME_CATEGORIES = [
  { key: "work", label: "Employment", hint: "gross wages, salary, tips, commissions" },
  { key: "support", label: "Support", hint: "child support, maintenance, cash assistance" },
  { key: "retirement", label: "Retirement", hint: "pensions, Social Security, SSI, VA, disability" },
  { key: "other", label: "Other", hint: "unemployment, rental, interest, dividends" },
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["key"];

/** Plain shape shared by the ledger UI, the API layer and the snapshot. */
export type HouseholdMemberInput = {
  fullName: string;
  roleLabel: string | null;
  workAmount: number;
  workFrequency: IncomeFrequency;
  supportAmount: number;
  supportFrequency: IncomeFrequency;
  retirementAmount: number;
  retirementFrequency: IncomeFrequency;
  otherAmount: number;
  otherFrequency: IncomeFrequency;
};

export type HouseholdMemberView = HouseholdMemberInput & {
  id: string;
  updatedAt: string;
};

/** Annualized total for one category on one member. */
export function categoryAnnual(member: HouseholdMemberInput, category: IncomeCategory): number {
  switch (category) {
    case "work":
      return toAnnual(member.workAmount, member.workFrequency);
    case "support":
      return toAnnual(member.supportAmount, member.supportFrequency);
    case "retirement":
      return toAnnual(member.retirementAmount, member.retirementFrequency);
    case "other":
      return toAnnual(member.otherAmount, member.otherFrequency);
  }
}

export function memberAnnualTotal(member: HouseholdMemberInput): number {
  return INCOME_CATEGORIES.reduce((sum, c) => sum + categoryAnnual(member, c.key), 0);
}

export function householdAnnualTotal(members: HouseholdMemberInput[]): number {
  return members.reduce((sum, m) => sum + memberAnnualTotal(m), 0);
}

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const CURRENCY_CENTS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, opts?: { cents?: boolean }): string {
  if (!Number.isFinite(value)) return "$0";
  return opts?.cents ? CURRENCY_CENTS.format(value) : CURRENCY.format(value);
}

/**
 * Initials for the ledger avatar. "Marcus Ellison" → "ME".
 *
 * Re-exported from lib/utils so the ledger and the admin tables can't drift
 * into two different ideas of what an initial is.
 */
export { initialsOf } from "@/lib/utils";

// ── Income snapshot ──────────────────────────────────────────────────────────

export type IncomeSnapshotCategory = {
  amount: number;
  frequency: IncomeFrequency;
  annual: number;
};

export type IncomeSnapshotMember = {
  full_name: string;
  role_label: string | null;
  work: IncomeSnapshotCategory;
  support: IncomeSnapshotCategory;
  retirement: IncomeSnapshotCategory;
  other: IncomeSnapshotCategory;
  annual_total: number;
};

export type IncomeSnapshot = {
  captured_at: string;
  member_count: number;
  annual_total: number;
  members: IncomeSnapshotMember[];
};

/**
 * Freeze the household at submission time. The live `household_members` rows
 * keep changing; this does not. Reviewers see what was certified.
 */
export function buildIncomeSnapshot(
  members: HouseholdMemberInput[],
  capturedAt: Date = new Date(),
): IncomeSnapshot {
  const category = (
    amount: number,
    frequency: IncomeFrequency,
  ): IncomeSnapshotCategory => ({
    amount,
    frequency,
    annual: toAnnual(amount, frequency),
  });

  return {
    captured_at: capturedAt.toISOString(),
    member_count: members.length,
    annual_total: householdAnnualTotal(members),
    members: members.map((m) => ({
      full_name: m.fullName,
      role_label: m.roleLabel,
      work: category(m.workAmount, m.workFrequency),
      support: category(m.supportAmount, m.supportFrequency),
      retirement: category(m.retirementAmount, m.retirementFrequency),
      other: category(m.otherAmount, m.otherFrequency),
      annual_total: memberAnnualTotal(m),
    })),
  };
}

/** Narrow an unknown JSON column back to a snapshot without trusting it. */
export function readIncomeSnapshot(value: unknown): IncomeSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snap = value as Partial<IncomeSnapshot>;
  if (!Array.isArray(snap.members) || typeof snap.annual_total !== "number") return null;
  return snap as IncomeSnapshot;
}
