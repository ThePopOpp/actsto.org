import type { FilingStatus } from "@/lib/tax-credit";

/**
 * A donor's federal filing status, as saved on their Individual Donor profile.
 * Client-safe.
 *
 * Arizona's private school tax credit has two limits: one for married couples
 * filing jointly, and one for everyone else (single, head of household and
 * married filing separately all use the single limit).
 */
export const DONOR_FILING_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married filing jointly" },
  { value: "married_separate", label: "Married filing separately" },
  { value: "head_of_household", label: "Head of household" },
] as const;

export type DonorFilingStatus = (typeof DONOR_FILING_STATUSES)[number]["value"];

export function isDonorFilingStatus(value: unknown): value is DonorFilingStatus {
  return DONOR_FILING_STATUSES.some((s) => s.value === value);
}

/** Which credit limit a filing status uses. Older rows may hold "married". */
export function creditLimitFiling(status: string | null | undefined): FilingStatus | null {
  if (!status) return null;
  if (status === "married_joint" || status === "married") return "married";
  return isDonorFilingStatus(status) ? "single" : null;
}
