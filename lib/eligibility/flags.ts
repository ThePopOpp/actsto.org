/**
 * Eligibility flag vocabulary. Client-safe.
 *
 * A flag is per student and school year, except displaced, which is verified
 * once and lasts all of K-12 (stored with school year "K-12").
 */

export const ELIGIBILITY_FLAGS = ["low_income", "disabled", "displaced", "overflow"] as const;
export type EligibilityFlag = (typeof ELIGIBILITY_FLAGS)[number];

export const FLAG_STATUSES = [
  "pending_review",
  "awaiting_dcs",
  "info_requested",
  "approved",
  "denied",
  "revoked",
] as const;
export type FlagStatus = (typeof FLAG_STATUSES)[number];

export const DISPLACED_SCOPE = "K-12";

export function isEligibilityFlag(value: unknown): value is EligibilityFlag {
  return typeof value === "string" && (ELIGIBILITY_FLAGS as readonly string[]).includes(value);
}

export function isFlagStatus(value: unknown): value is FlagStatus {
  return typeof value === "string" && (FLAG_STATUSES as readonly string[]).includes(value);
}

export const FLAG_LABEL: Record<EligibilityFlag, string> = {
  low_income: "Low-income (corporate)",
  disabled: "Disabled",
  displaced: "Displaced",
  overflow: "Overflow / Switcher",
};

/** What a parent reads on the student card when a flag is approved. */
export const FLAG_PARENT_LABEL: Record<EligibilityFlag, string> = {
  low_income: "Eligible: Low-income corporate scholarship",
  disabled: "Eligible: Disabled/displaced corporate scholarship (disability)",
  displaced: "Eligible: Disabled/displaced corporate scholarship (displaced)",
  overflow: "Eligible: Overflow scholarship",
};

export const FLAG_STATUS_LABEL: Record<FlagStatus, string> = {
  pending_review: "Under review",
  awaiting_dcs: "Sent to DCS",
  info_requested: "More information needed",
  approved: "Approved",
  denied: "Not approved",
  revoked: "Revoked",
};
