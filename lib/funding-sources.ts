/**
 * Funding sources: which program a donation's dollars belong to, and which
 * students each program may reach.
 *
 * The vocabulary is shared by donations (DonationFundSplit), awards
 * (ScholarshipAward) and caps (ScholarshipCap), so the same word means the same
 * money everywhere. Client-safe.
 */

export const FUNDING_SOURCES = [
  "individual_original",
  "individual_overflow",
  "corporate_low_income",
  "corporate_disabled_displaced",
  "corporate_other",
  "unrestricted",
] as const;

export type FundingSource = (typeof FUNDING_SOURCES)[number];

export function isFundingSource(value: unknown): value is FundingSource {
  return typeof value === "string" && (FUNDING_SOURCES as readonly string[]).includes(value);
}

/** Staff-facing names. */
export const FUNDING_SOURCE_LABEL: Record<FundingSource, string> = {
  individual_original: "Individual · Original",
  individual_overflow: "Individual · Overflow / Switcher",
  corporate_low_income: "Corporate · Low-income",
  corporate_disabled_displaced: "Corporate · Disabled/displaced",
  corporate_other: "Corporate · Unassigned program",
  unrestricted: "Unrestricted",
};

/** Parent-facing names: what a family reads on the student card. */
export const FUNDING_SOURCE_PARENT_LABEL: Record<FundingSource, string> = {
  individual_original: "Original scholarship",
  individual_overflow: "Overflow scholarship",
  corporate_low_income: "Low-income corporate scholarship",
  corporate_disabled_displaced: "Disabled/displaced corporate scholarship",
  corporate_other: "Corporate scholarship",
  unrestricted: "General scholarship",
};

/** The two programs a business donor chooses between on the corporate form. */
export const CORPORATE_PROGRAMS = [
  {
    value: "corporate_low_income" as const,
    label: "Low-income scholarships",
    detail:
      "For students whose household income is within 185% of the reduced-price lunch limit (A.R.S. § 43-1183).",
  },
  {
    value: "corporate_disabled_displaced" as const,
    label: "Disabled or displaced student scholarships",
    detail:
      "For students with a disability, or who were placed in Arizona foster care under A.R.S. Title 8 (A.R.S. § 43-1184).",
  },
];

export type CorporateProgram = (typeof CORPORATE_PROGRAMS)[number]["value"];

export function isCorporateProgram(value: unknown): value is CorporateProgram {
  return value === "corporate_low_income" || value === "corporate_disabled_displaced";
}

/**
 * The eligibility each fund requires. Enforced on the server at award time.
 * `approved_application` means a verified, unrevoked approval for the school
 * year (student_year_eligibility); the others are approved eligibility flags.
 * A student may receive from every fund they qualify for.
 */
export const FUND_REQUIREMENT: Record<
  FundingSource,
  { anyOf: ("approved_application" | "overflow" | "low_income" | "disabled" | "displaced")[]; text: string }
> = {
  individual_original: { anyOf: ["approved_application"], text: "an approved application for the school year" },
  individual_overflow: { anyOf: ["overflow"], text: "a verified Overflow/Switcher qualification" },
  corporate_low_income: { anyOf: ["low_income"], text: "approved low-income eligibility for the school year" },
  corporate_disabled_displaced: { anyOf: ["disabled", "displaced"], text: "an approved disability or displacement verification" },
  corporate_other: { anyOf: ["approved_application"], text: "an approved application (assign the corporate program before awarding)" },
  unrestricted: { anyOf: ["approved_application"], text: "an approved application for the school year" },
};

/**
 * Split an individual tax-credit gift into Original and Overflow dollars.
 *
 * Arizona applies a donor's gifts to the Original credit first, up to its
 * limit, and the rest to the Overflow (Switcher) credit. `priorOriginal` is what
 * the donor has already given toward the Original credit this tax year (other
 * STOs plus earlier gifts to us), as they told us on the form. Anything above
 * both limits is still Overflow money for allocation purposes.
 */
export function splitIndividualGift(
  amount: number,
  originalLimit: number,
  priorTotal: number,
): { fundingSource: FundingSource; amount: number }[] {
  const roomOriginal = Math.max(0, originalLimit - Math.max(0, priorTotal));
  const original = Math.min(amount, roomOriginal);
  const overflow = Math.round((amount - original) * 100) / 100;
  const parts: { fundingSource: FundingSource; amount: number }[] = [];
  if (original > 0) parts.push({ fundingSource: "individual_original", amount: Math.round(original * 100) / 100 });
  if (overflow > 0) parts.push({ fundingSource: "individual_overflow", amount: overflow });
  return parts;
}
