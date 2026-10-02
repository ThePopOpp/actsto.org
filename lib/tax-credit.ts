/** A four-digit tax year, e.g. "2026". Years are data, added by Super Admins. */
export type TaxYear = string;
export type FilingStatus = "single" | "married";
export type TaxYearLimits = {
  single: { original: number; overflow: number; combined: number };
  married: { original: number; overflow: number; combined: number };
};
export type TaxCreditLimitConfig = Record<TaxYear, TaxYearLimits>;

/** Statutory-style caps for UI; confirm annually with legal / AZ DOR guidance. */
export const TAX_CREDIT_MAX: Record<
  TaxYear,
  { single: number; married: number }
> = {
  "2025": { single: 1535, married: 3062 },
  "2026": { single: 1571, married: 3131 },
};

export const DEFAULT_TAX_CREDIT_LIMITS: TaxCreditLimitConfig = {
  "2025": {
    single: { original: 769, overflow: 766, combined: 1535 },
    married: { original: 1535, overflow: 1527, combined: 3062 },
  },
  "2026": {
    single: { original: 787, overflow: 784, combined: 1571 },
    married: { original: 1570, overflow: 1561, combined: 3131 },
  },
};

export function isTaxYear(value: unknown): value is TaxYear {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= 2000 && year <= 2100;
}

/** Configured years, newest first. */
export function taxYearsOf(limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS): TaxYear[] {
  return Object.keys(limits)
    .filter(isTaxYear)
    .sort((a, b) => Number(b) - Number(a));
}

/**
 * The year public copy quotes: this calendar year when it is configured,
 * otherwise the newest configured year not in the future, otherwise the newest.
 */
export function currentTaxYear(
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
  now: Date = new Date(),
): TaxYear {
  const years = taxYearsOf(limits);
  const calendar = now.getFullYear();
  return years.find((y) => Number(y) <= calendar) ?? years[years.length - 1] ?? String(calendar);
}

export function currentTaxYearLimits(
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
  now: Date = new Date(),
): TaxYearLimits {
  return limits[currentTaxYear(limits, now)] ?? DEFAULT_TAX_CREDIT_LIMITS["2026"];
}

/**
 * Years a donor may still claim a gift against, newest first.
 *
 * Arizona lets a gift made from January 1 through April 15 count toward the
 * prior tax year (A.R.S. § 43-1089), so the prior year is offered only in that
 * window. Years without configured limits are never offered.
 */
export function donationTaxYears(
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
  now: Date = new Date(),
): TaxYear[] {
  const calendar = now.getFullYear();
  const beforeDeadline = now < new Date(calendar, 3, 16);
  const wanted = [String(calendar), ...(beforeDeadline ? [String(calendar - 1)] : [])];
  const offered = wanted.filter((y) => limits[y]);
  return offered.length > 0 ? offered : [currentTaxYear(limits, now)];
}

export function getMaxForYearAndFiling(
  taxYear: TaxYear,
  filing: FilingStatus,
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
): number {
  return (limits[taxYear] ?? currentTaxYearLimits(limits))[filing].combined;
}

/** Original vs overflow caps for a tax year. */
export function getOriginalOverflowForYear(
  taxYear: TaxYear,
  limits: TaxCreditLimitConfig = DEFAULT_TAX_CREDIT_LIMITS,
) {
  return limits[taxYear] ?? currentTaxYearLimits(limits);
}

/**
 * Capacity used toward the annual cap from other STOs plus prior ACT gifts this tax year,
 * then how much of this donation counts as current-year credit vs carry-forward (A.R.S. § 43-1089).
 */
export function summarizeTaxCredit(args: {
  taxYear: TaxYear;
  filing: FilingStatus;
  otherStoTotal: number;
  /** Gifts to this ACT toward the same credit already made this tax year */
  priorActDonationsThisYear?: number;
  actDonation: number;
  limits?: TaxCreditLimitConfig;
}) {
  const max = getMaxForYearAndFiling(args.taxYear, args.filing, args.limits);
  const other = Math.max(0, args.otherStoTotal);
  const priorAct = Math.max(0, args.priorActDonationsThisYear ?? 0);
  const usedTowardCap = other + priorAct;
  const remainingCapacity = Math.max(0, max - usedTowardCap);
  const donation = Math.max(0, args.actDonation);
  const eligibleCredit = Math.min(donation, remainingCapacity);
  const futureCarryForward = Math.max(0, donation - eligibleCredit);
  return {
    maxCredit: max,
    /** Capacity left for this gift after other STO + prior ACT gifts */
    remainingCapacityBeforeGift: remainingCapacity,
    eligibleCredit,
    /** Portion of this gift that exceeds remaining cap — carried forward up to 5 years */
    futureCarryForward,
    taxDeductionDisplay: eligibleCredit,
    usedTowardCapBeforeThisGift: usedTowardCap,
  };
}
