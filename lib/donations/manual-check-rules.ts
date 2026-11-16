/**
 * Rules for a check (offline) donation a Super Admin records by hand. Pure and
 * client-safe: the form uses them for instant feedback, the server uses the
 * same functions to decide, and scripts/test-manual-check-rules.mts tests them.
 *
 * Spec: docs/scott-spaulding/ACTSTO-manual-check-donations-spec.md
 */

import { isCorporateProgram, isFundingSource, type FundingSource } from "@/lib/funding-sources";
import { checkNumberRequired, isOfflinePaymentMethod, type OfflinePaymentMethod } from "@/lib/donations/payment-methods";

export type DonorType = "individual" | "business";

/** Above this, the admin confirms the amount before it saves. */
export const LARGE_GIFT_CONFIRM_USD = 100_000;

/** Individual donors give to these; business donors to the two corporate programs. */
export const INDIVIDUAL_CHECK_FUNDS: FundingSource[] = ["individual_original", "individual_overflow", "unrestricted"];
export const BUSINESS_CHECK_FUNDS: FundingSource[] = ["corporate_low_income", "corporate_disabled_displaced"];

export function fundsForDonorType(type: DonorType): FundingSource[] {
  return type === "business" ? BUSINESS_CHECK_FUNDS : INDIVIDUAL_CHECK_FUNDS;
}

/** The same two filing statuses as the online individual form (they pick the credit limit). */
export const CHECK_FILING_STATUSES = [
  { value: "single", label: "Single / head of household / married filing separately" },
  { value: "married", label: "Married filing jointly" },
] as const;
export type CheckFilingStatus = (typeof CHECK_FILING_STATUSES)[number]["value"];
export function isCheckFilingStatus(v: unknown): v is CheckFilingStatus {
  return v === "single" || v === "married";
}

export const RELATIONSHIP_ACK_METHODS = [
  { value: "staff_attested", label: "Donor confirmed it to staff" },
  { value: "paper_form", label: "Donor signed a paper form (attach it)" },
] as const;
export type RelationshipAckMethod = (typeof RELATIONSHIP_ACK_METHODS)[number]["value"];

// ── Dates ────────────────────────────────────────────────────────────────────

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" → parts, or null when it isn't a real calendar date. */
export function parseIsoDate(value: unknown): { y: number; m: number; d: number } | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Jan 1 to Apr 15 inclusive: a gift then may be claimed for the prior or the current tax year. */
export function inPriorYearWindow(value: string | null | undefined): boolean {
  const p = parseIsoDate(value);
  if (!p) return false;
  return p.m < 4 || (p.m === 4 && p.d <= 15);
}

export type TaxYearChoice = {
  /** Pre-selected year: the year on the check, else the year received. */
  defaultYear: number | null;
  /** True when a date falls Jan 1 to Apr 15: the admin must pick a year with the donor. */
  choiceRequired: boolean;
  /** The years offered. In the window, prior and current; otherwise around the default. */
  options: number[];
};

/**
 * Tax year for a check (spec 5.7). Default = year of the check date, falling
 * back to the date received. When either date falls Jan 1 to Apr 15 the donor
 * may claim the prior or the current year, so the form shows both and requires
 * an explicit choice — no silent default in that window.
 */
export function taxYearChoice(checkDate: string | null | undefined, dateReceived: string | null | undefined): TaxYearChoice {
  const check = parseIsoDate(checkDate ?? null);
  const received = parseIsoDate(dateReceived ?? null);
  const base = check ?? received;
  if (!base) return { defaultYear: null, choiceRequired: false, options: [] };

  const defaultYear = base.y;
  // The window is anchored on whichever date falls in it (the check date first).
  const windowDate = [checkDate, dateReceived].find((v) => v && inPriorYearWindow(v)) ?? null;
  if (windowDate) {
    const y = parseIsoDate(windowDate)!.y;
    const options = Array.from(new Set([y - 1, y, defaultYear])).sort((a, b) => a - b);
    return { defaultYear, choiceRequired: true, options };
  }
  return { defaultYear, choiceRequired: false, options: [defaultYear - 1, defaultYear, defaultYear + 1] };
}

// ── Money ────────────────────────────────────────────────────────────────────

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseUsd(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? round2(value) : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return round2(Number(cleaned));
}

export type SplitLine = { fundingSource: string; amount: number | string };

/** What is left to assign across funds; 0 when the lines add up exactly. */
export function splitRemaining(total: number, lines: SplitLine[]): number {
  const assigned = lines.reduce((sum, l) => sum + (parseUsd(l.amount) ?? 0), 0);
  return round2(total - assigned);
}

// ── The whole form ───────────────────────────────────────────────────────────

export type ManualCheckInput = {
  donorType?: unknown;
  linkUserId?: unknown;
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  businessName?: unknown;
  ein?: unknown;
  contactFirstName?: unknown;
  contactLastName?: unknown;
  contactTitle?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  email?: unknown;
  phone?: unknown;
  amount?: unknown;
  method?: unknown;
  checkNumber?: unknown;
  drawerName?: unknown;
  checkDate?: unknown;
  dateReceived?: unknown;
  dateDeposited?: unknown;
  internalNotes?: unknown;
  splits?: unknown;
  campaignId?: unknown;
  schoolId?: unknown;
  studentIds?: unknown;
  relationshipAck?: unknown;
  relationshipAckMethod?: unknown;
  taxYear?: unknown;
  taxYearConfirmed?: unknown;
  taxYearConfirmation?: unknown;
  filingStatus?: unknown;
  otherStoGifts?: unknown;
  showNamePublicly?: unknown;
  emailReceipt?: unknown;
  confirmDuplicate?: unknown;
  confirmLargeAmount?: unknown;
};

export type ManualCheck = {
  donorType: DonorType;
  linkUserId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  businessName: string | null;
  ein: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  email: string | null;
  phone: string | null;
  amount: number;
  method: OfflinePaymentMethod;
  checkNumber: string | null;
  drawerName: string | null;
  checkDate: string | null;
  dateReceived: string;
  dateDeposited: string | null;
  internalNotes: string | null;
  splits: { fundingSource: FundingSource; amount: number }[];
  campaignId: string | null;
  schoolId: string | null;
  studentIds: string[];
  relationshipAck: boolean;
  relationshipAckMethod: RelationshipAckMethod | null;
  taxYear: number;
  taxYearConfirmation: string | null;
  filingStatus: CheckFilingStatus | null;
  otherStoGifts: number;
  showNamePublicly: boolean;
  emailReceipt: boolean;
  confirmDuplicate: boolean;
  confirmLargeAmount: boolean;
};

export type ManualCheckResult =
  | { ok: true; value: ManualCheck; warnings: string[] }
  | { ok: false; error: string; field?: string; needsConfirm?: "large_amount" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function opt(v: unknown, max = 200): string | null {
  return text(v, max) || null;
}
function fail(error: string, field?: string): ManualCheckResult {
  return { ok: false, error, field };
}

/**
 * Validate and normalize the form. `today` is the Arizona date ("YYYY-MM-DD")
 * so a check can't be recorded as received in the future.
 *
 * Duplicate check numbers are a server lookup, not decided here.
 */
export function normalizeManualCheck(raw: ManualCheckInput, today: string): ManualCheckResult {
  const warnings: string[] = [];
  const donorType: DonorType | null = raw.donorType === "business" ? "business" : raw.donorType === "individual" ? "individual" : null;
  if (!donorType) return fail("Choose Individual or Business.", "donorType");

  const linkUserId = opt(raw.linkUserId, 64);
  if (linkUserId && !UUID.test(linkUserId)) return fail("That account link isn't valid.", "linkUserId");

  // Donor
  let firstName: string | null = null;
  let middleName: string | null = null;
  let lastName: string | null = null;
  let businessName: string | null = null;
  let ein: string | null = null;
  let contactFirstName: string | null = null;
  let contactLastName: string | null = null;
  let contactTitle: string | null = null;
  if (donorType === "individual") {
    firstName = opt(raw.firstName, 80);
    middleName = opt(raw.middleName, 80);
    lastName = opt(raw.lastName, 80);
    if (!firstName || !lastName) return fail("Enter the donor's first and last name.", "firstName");
  } else {
    businessName = opt(raw.businessName, 160);
    if (!businessName) return fail("Enter the business's legal name.", "businessName");
    const digits = text(raw.ein, 20).replace(/\D/g, "");
    if (digits.length !== 9) return fail("Enter the business's 9-digit EIN.", "ein");
    ein = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    contactFirstName = opt(raw.contactFirstName, 80);
    contactLastName = opt(raw.contactLastName, 80);
    contactTitle = opt(raw.contactTitle, 80);
    if (!contactFirstName || !contactLastName) return fail("Enter the business contact's name.", "contactFirstName");
  }

  const addressLine1 = text(raw.addressLine1, 160);
  const city = text(raw.city, 80);
  const state = text(raw.state, 40).toUpperCase();
  const zip = text(raw.zip, 10);
  if (!addressLine1 || !city || !state || !zip) return fail("Enter the full mailing address. The receipt needs it.", "addressLine1");
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return fail("Enter a 5-digit ZIP code.", "zip");

  const email = opt(raw.email, 160)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) return fail("That email address doesn't look right.", "email");
  if (!email) warnings.push("No email: the receipt will be generated for download or print only.");

  // Gift
  const amount = parseUsd(raw.amount);
  if (amount === null || amount <= 0) return fail("Enter the check amount, like 1500 or 1500.00.", "amount");
  const confirmLargeAmount = raw.confirmLargeAmount === true;
  if (amount > LARGE_GIFT_CONFIRM_USD && !confirmLargeAmount) {
    return { ok: false, error: `This gift is over $${LARGE_GIFT_CONFIRM_USD.toLocaleString("en-US")}. Confirm the amount is right.`, field: "amount", needsConfirm: "large_amount" };
  }

  const method = raw.method ?? "check";
  if (!isOfflinePaymentMethod(method)) return fail("Choose how it was paid.", "method");
  const checkNumber = opt(raw.checkNumber, 40);
  if (checkNumberRequired(method) && !checkNumber) return fail("Enter the check number.", "checkNumber");

  const dateReceived = text(raw.dateReceived, 10);
  if (!parseIsoDate(dateReceived)) return fail("Enter the date the check was received.", "dateReceived");
  if (dateReceived > today) return fail("The date received can't be in the future.", "dateReceived");
  const checkDate = opt(raw.checkDate, 10);
  if (checkDate && !parseIsoDate(checkDate)) return fail("The date on the check isn't a valid date.", "checkDate");
  const dateDeposited = opt(raw.dateDeposited, 10);
  if (dateDeposited && !parseIsoDate(dateDeposited)) return fail("The deposit date isn't a valid date.", "dateDeposited");
  if (dateDeposited && dateDeposited < dateReceived) return fail("The deposit date is before the date received.", "dateDeposited");

  // Funds: required, matched to the donor type, adding up to the check exactly.
  const allowed = fundsForDonorType(donorType);
  const rawSplits = Array.isArray(raw.splits) ? (raw.splits as SplitLine[]) : [];
  const splits: { fundingSource: FundingSource; amount: number }[] = [];
  for (const line of rawSplits.slice(0, 10)) {
    const fundingSource = line?.fundingSource;
    const part = parseUsd(line?.amount);
    if (part === null || part === 0) continue;
    if (!isFundingSource(fundingSource) || !allowed.includes(fundingSource)) {
      return fail(
        donorType === "business"
          ? "A business check goes to Corporate low-income or Corporate disabled/displaced."
          : "An individual check goes to Original, Overflow / Switcher, or Unrestricted.",
        "splits",
      );
    }
    if (part < 0) return fail("Fund amounts must be positive.", "splits");
    const existing = splits.find((s) => s.fundingSource === fundingSource);
    if (existing) existing.amount = round2(existing.amount + part);
    else splits.push({ fundingSource, amount: part });
  }
  if (!splits.length) return fail("Choose the funding source for this check.", "splits");
  const remaining = splitRemaining(amount, splits);
  if (Math.abs(remaining) > 0.004) {
    return fail(
      remaining > 0
        ? `The funds add up to $${(amount - remaining).toFixed(2)}; $${remaining.toFixed(2)} of the check is unassigned.`
        : `The funds add up to $${(amount - remaining).toFixed(2)}, more than the $${amount.toFixed(2)} check.`,
      "splits",
    );
  }
  if (donorType === "business" && splits.some((s) => !isCorporateProgram(s.fundingSource))) {
    return fail("Choose the corporate program this check supports.", "splits");
  }

  // Recommendation (non-binding). The server re-checks students against the campaign.
  const campaignId = opt(raw.campaignId, 64);
  if (campaignId && !UUID.test(campaignId)) return fail("Choose a campaign from the list.", "campaignId");
  const schoolId = opt(raw.schoolId, 64);
  if (schoolId && !UUID.test(schoolId)) return fail("Choose a school from the list.", "schoolId");
  const studentIds = Array.isArray(raw.studentIds)
    ? Array.from(new Set(raw.studentIds.filter((id): id is string => typeof id === "string" && UUID.test(id)))).slice(0, 50)
    : [];
  if (donorType === "business" && studentIds.length) {
    return fail("A business check can recommend a school, not a student.", "studentIds");
  }
  if (studentIds.length && !campaignId) return fail("Choose the campaign the students are on.", "campaignId");
  const relationshipAck = raw.relationshipAck === true;
  const ackMethod = raw.relationshipAckMethod;
  const relationshipAckMethod: RelationshipAckMethod | null =
    ackMethod === "staff_attested" || ackMethod === "paper_form" ? ackMethod : null;
  if (studentIds.length && (!relationshipAck || !relationshipAckMethod)) {
    return fail("Record the donor's relationship acknowledgment, and how it was given, before recommending a student.", "relationshipAck");
  }

  // Tax year
  const choice = taxYearChoice(checkDate, dateReceived);
  const taxYear = raw.taxYear === null || raw.taxYear === undefined || raw.taxYear === "" ? NaN : Number(raw.taxYear);
  if (!Number.isInteger(taxYear) || taxYear < 2000) return fail("Choose the tax year.", "taxYear");
  if (choice.choiceRequired) {
    if (raw.taxYearConfirmed !== true) {
      return fail("This check falls between Jan 1 and Apr 15. Confirm the tax year with the donor and choose it.", "taxYear");
    }
    if (!choice.options.includes(taxYear)) return fail(`Choose ${choice.options.join(" or ")}.`, "taxYear");
  } else if (choice.defaultYear !== null && Math.abs(taxYear - choice.defaultYear) > 1) {
    return fail("That tax year is too far from the check's date.", "taxYear");
  }
  const taxYearConfirmation = opt(raw.taxYearConfirmation, 300);

  const filingStatus = donorType === "individual" ? (isCheckFilingStatus(raw.filingStatus) ? raw.filingStatus : null) : null;
  if (donorType === "individual" && !filingStatus) return fail("Choose the donor's filing status.", "filingStatus");

  const otherStoGifts = parseUsd(raw.otherStoGifts ?? 0) ?? 0;

  return {
    ok: true,
    warnings,
    value: {
      donorType,
      linkUserId,
      firstName,
      middleName,
      lastName,
      businessName,
      ein,
      contactFirstName,
      contactLastName,
      contactTitle,
      addressLine1,
      addressLine2: opt(raw.addressLine2, 80),
      city,
      state,
      zip,
      email,
      phone: opt(raw.phone, 30),
      amount,
      method,
      checkNumber,
      drawerName: opt(raw.drawerName, 160),
      checkDate,
      dateReceived,
      dateDeposited,
      internalNotes: opt(raw.internalNotes, 2000),
      splits,
      campaignId,
      schoolId,
      studentIds,
      relationshipAck: studentIds.length > 0 && relationshipAck,
      relationshipAckMethod: studentIds.length > 0 ? relationshipAckMethod : null,
      taxYear,
      taxYearConfirmation,
      filingStatus,
      otherStoGifts,
      // SMS opt-in is never set from this form (spec 7.6); public display defaults off.
      showNamePublicly: raw.showNamePublicly === true,
      emailReceipt: Boolean(email) && raw.emailReceipt === true,
      confirmDuplicate: raw.confirmDuplicate === true,
      confirmLargeAmount,
    },
  };
}

/** The donor's name as it goes on the receipt. */
export function receiptName(v: Pick<ManualCheck, "donorType" | "businessName" | "firstName" | "middleName" | "lastName">): string {
  if (v.donorType === "business") return v.businessName ?? "";
  return [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");
}
