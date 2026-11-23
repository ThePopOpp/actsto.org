import "server-only";

import type { Prisma } from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/audit";
import { fundBalances } from "@/lib/allocation/server";
import { RELATIONSHIP_ACK_TEXT, sanitizeRecommendation } from "@/lib/donations/recommendations";
import {
  normalizeManualCheck,
  receiptName,
  round2,
  type ManualCheck,
  type ManualCheckInput,
} from "@/lib/donations/manual-check-rules";
import { EXCLUDE_ARCHIVED_TESTS } from "@/lib/donors/server";
import { sendDonationReceiptEmail } from "@/lib/email/donation-receipt";
import { isoDateInArizona } from "@/lib/format-date";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import {
  creditPaidDonationToCampaign,
  ensureTaxReceiptForDonation,
  firePaidDonationAutomations,
  getBackerDisplayForDonation,
} from "@/lib/paypal/payment-records";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";
import { getOriginalOverflowForYear } from "@/lib/tax-credit";
import { getTaxCreditLimitConfig } from "@/lib/tax-credit-limits-server";

/**
 * Checks (and cashier's checks and money orders) recorded by a Super Admin.
 *
 * A recorded check is an ordinary paid donation: the same donation, detail,
 * fund split, recommendation, campaign credit, receipt and automations as a
 * PayPal capture, so Payments, the Dashboard, Allocation, Donors, Receipts and
 * the exports all count it without knowing it's a check. What only a check has
 * (number, dates, notes, attachment, who recorded it) lives in
 * donation_offline_payments.
 *
 * Written as a service, not inside the route, so a CSV import can reuse it.
 * Spec: docs/scott-spaulding/ACTSTO-manual-check-donations-spec.md
 */

export type ManualCheckActor = { id: string | null; email: string };

export class ManualCheckError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ManualCheckError";
  }
}

export function arizonaToday(): string {
  return isoDateInArizona(new Date());
}

/**
 * When the gift is dated in our records. Everything that reports by date
 * (Dashboard year/month, Donors filters, the receipt's "Date of gift") reads
 * donations.created_at, so a check is dated the day it was received: now when
 * that's today, otherwise noon Arizona time on that day.
 */
function receivedAt(dateReceived: string): Date {
  if (dateReceived === arizonaToday()) return new Date();
  return new Date(`${dateReceived}T12:00:00-07:00`);
}

function dateOnly(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function isoFromDateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function normalizeOrThrow(raw: ManualCheckInput): { value: ManualCheck; warnings: string[] } {
  const result = normalizeManualCheck(raw, arizonaToday());
  if (!result.ok) {
    throw new ManualCheckError(result.error, 400, {
      field: result.field,
      ...(result.needsConfirm ? { needsConfirm: result.needsConfirm } : {}),
    });
  }
  return { value: result.value, warnings: result.warnings };
}

// ── Duplicates ───────────────────────────────────────────────────────────────

/**
 * Other recorded checks with the same number from the same donor (matched by
 * account, email, EIN or name). A warning, never a block: two donors' check
 * #1001 are different checks.
 */
export async function findDuplicateChecks(v: ManualCheck, excludeDonationId?: string) {
  if (!v.checkNumber) return [];
  const sameDonor: Prisma.DonationWhereInput[] = [];
  if (v.linkUserId) sameDonor.push({ userId: v.linkUserId });
  if (v.email) sameDonor.push({ donationDetail: { donorEmail: { equals: v.email, mode: "insensitive" } } });
  if (v.ein) sameDonor.push({ donationDetail: { businessEin: v.ein } });
  if (v.donorType === "individual" && v.firstName && v.lastName) {
    sameDonor.push({
      donationDetail: {
        donorFirstName: { equals: v.firstName, mode: "insensitive" },
        donorLastName: { equals: v.lastName, mode: "insensitive" },
      },
    });
  }
  if (v.businessName) sameDonor.push({ donationDetail: { businessName: { equals: v.businessName, mode: "insensitive" } } });
  if (!sameDonor.length) return [];

  const rows = await prisma.donation.findMany({
    where: {
      ...(excludeDonationId ? { id: { not: excludeDonationId } } : {}),
      offlinePayment: { checkNumber: { equals: v.checkNumber, mode: "insensitive" } },
      OR: sameDonor,
    },
    select: { id: true, amount: true, status: true, offlinePayment: { select: { dateReceived: true } } },
    take: 5,
  });
  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    status: r.status,
    dateReceived: isoFromDateOnly(r.offlinePayment?.dateReceived),
  }));
}

async function assertNoDuplicate(v: ManualCheck, excludeDonationId?: string) {
  if (v.confirmDuplicate || !v.checkNumber) return;
  const dupes = await findDuplicateChecks(v, excludeDonationId);
  if (dupes.length) {
    const first = dupes[0];
    throw new ManualCheckError(
      `Check #${v.checkNumber} from this donor was already recorded ($${first.amount.toFixed(2)}${first.dateReceived ? `, received ${first.dateReceived}` : ""}, ${first.status}). Save anyway if this is a different check.`,
      409,
      { needsConfirm: "duplicate", duplicates: dupes },
    );
  }
}

// ── Shared lookups ───────────────────────────────────────────────────────────

async function resolveRecommendation(v: ManualCheck) {
  const campaign = v.campaignId
    ? await prisma.campaign.findUnique({
        where: { id: v.campaignId },
        select: { id: true, slug: true, title: true, schoolId: true, isSchoolLevel: true },
      })
    : null;
  if (v.campaignId && !campaign) throw new ManualCheckError("That campaign no longer exists.", 400, { field: "campaignId" });

  const campaignStudentIds = campaign
    ? (
        await prisma.campaignStudent.findMany({
          where: { campaignId: campaign.id, campaign: { isSchoolLevel: false }, student: { status: { not: "archived" } } },
          select: { studentId: true },
        })
      ).map((r) => r.studentId)
    : [];

  // The same server rule as the online forms: never a student on a business
  // gift, and only students who are on the chosen campaign.
  const recommendation = sanitizeRecommendation({
    corporate: v.donorType === "business",
    designate: v.studentIds.length > 0 || Boolean(v.schoolId),
    studentIds: v.studentIds,
    campaignStudentIds,
    schoolId: v.schoolId,
  });
  if (recommendation.studentIds.length !== v.studentIds.length) {
    throw new ManualCheckError("Only students on the chosen campaign can be recommended.", 400, { field: "studentIds" });
  }
  if (v.schoolId) {
    const school = await prisma.school.findUnique({ where: { id: v.schoolId }, select: { id: true } });
    if (!school) throw new ManualCheckError("Choose a school from the list.", 400, { field: "schoolId" });
  }
  if (v.linkUserId) {
    const profile = await prisma.profile.findUnique({ where: { id: v.linkUserId }, select: { id: true } });
    if (!profile) throw new ManualCheckError("That donor account no longer exists.", 400, { field: "linkUserId" });
  }
  return { campaign, recommendation };
}

/** What the donor has already given ACT toward this tax year (paid individual gifts). */
async function priorActGiftsThisYear(v: ManualCheck, excludeDonationId?: string): Promise<number> {
  const sameDonor: Prisma.DonationWhereInput[] = [];
  if (v.linkUserId) sameDonor.push({ userId: v.linkUserId });
  if (v.email) sameDonor.push({ donationDetail: { donorEmail: { equals: v.email, mode: "insensitive" } } });
  if (!sameDonor.length) return 0;
  const agg = await prisma.donation.aggregate({
    where: {
      AND: [EXCLUDE_ARCHIVED_TESTS],
      ...(excludeDonationId ? { id: { not: excludeDonationId } } : {}),
      status: "paid",
      donationType: "tax_credit",
      taxYear: v.taxYear,
      OR: sameDonor,
    },
    _sum: { amount: true },
  });
  return round2(Number(agg._sum.amount ?? 0));
}

/**
 * The same metadata an online gift carries, so the receipt's tax credit
 * breakdown, STO reporting and Allocation read a check exactly like one.
 */
async function buildMetadata(
  v: ManualCheck,
  campaign: { slug: string; title: string } | null,
  recommendation: { studentIds: string[]; schoolId: string | null },
  actor: ManualCheckActor,
  excludeDonationId?: string,
): Promise<Prisma.InputJsonObject> {
  const base: Prisma.InputJsonObject = {
    source: "admin_manual",
    paymentMethod: v.method,
    recordedByEmail: actor.email,
    campaignSlug: campaign?.slug ?? null,
    campaignTitle: campaign?.title ?? null,
  };
  if (v.donorType === "business") {
    return {
      ...base,
      business: {
        program: v.splits[0].fundingSource,
        recommendedSchoolId: recommendation.schoolId,
      },
    };
  }
  const filing = v.filingStatus === "married" ? "married" : "single";
  const limits = getOriginalOverflowForYear(String(v.taxYear), await getTaxCreditLimitConfig())[filing];
  const priorAct = await priorActGiftsThisYear(v, excludeDonationId);
  const eligibleCredit = round2(Math.max(0, Math.min(v.amount, limits.combined - v.otherStoGifts - priorAct)));
  return {
    ...base,
    taxCredit: {
      designateStudent: recommendation.studentIds.length > 0,
      selectedCampaignSlug: campaign?.slug ?? null,
      selectedCampaignTitle: campaign?.title ?? null,
      recommendedStudentIds: recommendation.studentIds,
      creditLimit: limits.combined,
      eligibleCredit,
      previousStoTotal: v.otherStoGifts,
      priorActDonationsThisYear: priorAct,
      limitsAtGift: { original: limits.original, overflow: limits.overflow, combined: limits.combined },
      relationshipAck: v.relationshipAck,
      ...(v.relationshipAck
        ? { relationshipAckText: RELATIONSHIP_ACK_TEXT, relationshipAckAt: new Date().toISOString(), relationshipAckMethod: v.relationshipAckMethod }
        : {}),
      // Never set from this form: SMS needs the donor's own consent (spec 7.6).
      smsConsent: false,
    },
  };
}

function detailData(v: ManualCheck) {
  const isBusiness = v.donorType === "business";
  return {
    donorFirstName: isBusiness ? v.contactFirstName : v.firstName,
    donorMiddleName: isBusiness ? null : v.middleName,
    donorLastName: isBusiness ? v.contactLastName : v.lastName,
    donorEmail: v.email,
    donorPhone: v.phone,
    donorPhoneNormalized: v.phone ? normalizePhone(v.phone) : null,
    billingAddressLine1: v.addressLine1,
    billingAddressLine2: v.addressLine2,
    billingCity: v.city,
    billingState: v.state,
    billingZip: v.zip,
    taxYear: v.taxYear,
    filingStatus: v.filingStatus,
    isArizonaResident: isBusiness ? null : true,
    wantsTaxReceipt: true,
    businessName: v.businessName,
    businessEin: v.ein,
    businessContactTitle: v.contactTitle,
    publicDisplayName: isBusiness ? v.businessName : [v.firstName, v.lastName].filter(Boolean).join(" "),
    showNamePublicly: v.showNamePublicly,
    showAmountPublicly: false,
  };
}

function recommendationCreate(
  v: ManualCheck,
  campaign: { id: string; schoolId: string | null } | null,
  recommendation: { studentIds: string[]; schoolId: string | null },
  actor: ManualCheckActor,
) {
  if (!recommendation.studentIds.length && !recommendation.schoolId) return undefined;
  const ackHow = v.relationshipAckMethod === "paper_form" ? "signed paper form" : `confirmed to ${actor.email}`;
  return {
    recommendedCampaignId: campaign?.id ?? null,
    recommendedStudentId: recommendation.studentIds[0] ?? null,
    recommendedSchoolId: recommendation.schoolId ?? (recommendation.studentIds.length ? campaign?.schoolId ?? null : null),
    relationshipDisclosure:
      v.donorType === "business"
        ? "Corporate gift: school recommendation only."
        : recommendation.studentIds.length
          ? `Check: acknowledged (${ackHow}), recorded by ${actor.email} ${new Date().toISOString()}: ${RELATIONSHIP_ACK_TEXT}`
          : "Check: school recommendation only.",
    isDependentOfDonor: false,
    complianceStatus: "pending",
  };
}

function auditSummary(v: ManualCheck) {
  return {
    donorType: v.donorType,
    donor: receiptName(v),
    ein: v.ein ? `**-***${v.ein.slice(-4)}` : null,
    email: v.email,
    amount: v.amount,
    method: v.method,
    checkNumber: v.checkNumber,
    checkDate: v.checkDate,
    dateReceived: v.dateReceived,
    dateDeposited: v.dateDeposited,
    splits: v.splits,
    campaignId: v.campaignId,
    schoolId: v.schoolId,
    studentIds: v.studentIds,
    relationshipAckMethod: v.relationshipAckMethod,
    taxYear: v.taxYear,
    taxYearConfirmation: v.taxYearConfirmation,
    filingStatus: v.filingStatus,
  };
}

// ── Record ───────────────────────────────────────────────────────────────────

export async function recordManualCheck(raw: ManualCheckInput, actor: ManualCheckActor) {
  const { value: v, warnings } = normalizeOrThrow(raw);
  const { campaign, recommendation } = await resolveRecommendation(v);
  await assertNoDuplicate(v);

  const amountUsd = v.amount.toFixed(2);
  const metadata = await buildMetadata(v, campaign, recommendation, actor);
  const now = new Date();

  const donation = await prisma.donation.create({
    data: {
      userId: v.linkUserId,
      campaignId: campaign?.id ?? null,
      amount: amountUsd,
      totalAmount: amountUsd,
      donationType: v.donorType === "business" ? "business" : "tax_credit",
      status: "paid",
      paymentProvider: v.method,
      anonymous: !v.showNamePublicly,
      taxYear: v.taxYear,
      createdAt: receivedAt(v.dateReceived),
      metadata,
      fundSplits: {
        create: v.splits.map((s) => ({
          fundingSource: s.fundingSource,
          amount: s.amount,
          status: "confirmed",
          setBy: actor.id,
          setByEmail: actor.email,
          note: "Set when the check was recorded.",
        })),
      },
      donationDetail: { create: { ...detailData(v), metadata } },
      donorRecommendation: (() => {
        const create = recommendationCreate(v, campaign, recommendation, actor);
        return create ? { create } : undefined;
      })(),
      recommendedStudents: recommendation.studentIds.length
        ? { create: recommendation.studentIds.map((studentId) => ({ studentId })) }
        : undefined,
      offlinePayment: {
        create: {
          method: v.method,
          checkNumber: v.checkNumber,
          drawerName: v.drawerName,
          checkDate: dateOnly(v.checkDate),
          dateReceived: dateOnly(v.dateReceived)!,
          dateDeposited: dateOnly(v.dateDeposited),
          internalNotes: v.internalNotes,
          taxYearConfirmation: v.taxYearConfirmation,
          taxYearConfirmedAt: v.taxYearConfirmation ? now : null,
          relationshipAckMethod: v.relationshipAckMethod,
          relationshipAckByEmail: v.relationshipAck ? actor.email : null,
          relationshipAckAt: v.relationshipAck ? now : null,
          recordedBy: actor.id,
          recordedByEmail: actor.email,
          recordedAt: now,
        },
      },
    },
  });

  // Exactly what a PayPal capture does on the transition to paid.
  const backerDisplay = await getBackerDisplayForDonation(donation.id);
  await creditPaidDonationToCampaign(donation, amountUsd, backerDisplay);
  const receipt = await ensureTaxReceiptForDonation(donation.id, amountUsd);
  const emailed = v.emailReceipt ? await sendDonationReceiptEmail(donation.id) : false;
  await firePaidDonationAutomations(donation, receipt, amountUsd);

  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "donation.manual_check_create",
    entityType: "donation",
    entityId: donation.id,
    after: { ...auditSummary(v), receiptNumber: receipt.receiptNumber, emailed },
  });

  return { donationId: donation.id, receiptId: receipt.id, receiptNumber: receipt.receiptNumber, emailed, warnings };
}

// ── Read (for the edit form) ─────────────────────────────────────────────────

export async function getManualCheck(id: string) {
  const d = await prisma.donation.findUnique({
    where: { id },
    include: {
      donationDetail: true,
      fundSplits: true,
      offlinePayment: true,
      recommendedStudents: { select: { studentId: true } },
      donorRecommendation: { select: { recommendedSchoolId: true } },
      taxReceipts: { orderBy: { createdAt: "desc" } },
      awards: { where: { status: { not: "reversed" } }, select: { id: true, awardAmount: true } },
    },
  });
  if (!d || !d.offlinePayment) return null;
  const o = d.offlinePayment;
  const dd = d.donationDetail;
  const isBusiness = d.donationType === "business";
  return {
    id: d.id,
    status: d.status,
    awardsCount: d.awards.length,
    receipts: d.taxReceipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      status: r.status,
      taxYear: r.taxYear,
      voidReason: r.voidReason,
    })),
    attachment: o.attachmentPath ? { name: o.attachmentName, size: o.attachmentSize, hold: o.attachmentHold } : null,
    recordedByEmail: o.recordedByEmail,
    recordedAt: o.recordedAt.toISOString(),
    returnedAt: o.returnedAt?.toISOString() ?? null,
    returnedReason: o.returnedReason,
    form: {
      donorType: isBusiness ? "business" : "individual",
      linkUserId: d.userId,
      firstName: isBusiness ? "" : dd?.donorFirstName ?? "",
      middleName: isBusiness ? "" : dd?.donorMiddleName ?? "",
      lastName: isBusiness ? "" : dd?.donorLastName ?? "",
      businessName: dd?.businessName ?? "",
      ein: dd?.businessEin ?? "",
      contactFirstName: isBusiness ? dd?.donorFirstName ?? "" : "",
      contactLastName: isBusiness ? dd?.donorLastName ?? "" : "",
      contactTitle: dd?.businessContactTitle ?? "",
      addressLine1: dd?.billingAddressLine1 ?? "",
      addressLine2: dd?.billingAddressLine2 ?? "",
      city: dd?.billingCity ?? "",
      state: dd?.billingState ?? "",
      zip: dd?.billingZip ?? "",
      email: dd?.donorEmail ?? "",
      phone: dd?.donorPhone ?? "",
      amount: Number(d.amount).toFixed(2),
      method: o.method,
      checkNumber: o.checkNumber ?? "",
      drawerName: o.drawerName ?? "",
      checkDate: isoFromDateOnly(o.checkDate) ?? "",
      dateReceived: isoFromDateOnly(o.dateReceived) ?? "",
      dateDeposited: isoFromDateOnly(o.dateDeposited) ?? "",
      internalNotes: o.internalNotes ?? "",
      splits: d.fundSplits.map((s) => ({ fundingSource: s.fundingSource, amount: Number(s.amount).toFixed(2) })),
      campaignId: d.campaignId ?? "",
      schoolId: d.donorRecommendation?.recommendedSchoolId ?? "",
      studentIds: d.recommendedStudents.map((s) => s.studentId),
      relationshipAck: Boolean(o.relationshipAckAt),
      relationshipAckMethod: o.relationshipAckMethod ?? "",
      taxYear: d.taxYear ? String(d.taxYear) : "",
      taxYearConfirmed: true,
      taxYearConfirmation: o.taxYearConfirmation ?? "",
      filingStatus: dd?.filingStatus === "married" ? "married" : dd?.filingStatus ? "single" : "",
      otherStoGifts: String(
        (d.metadata as { taxCredit?: { previousStoTotal?: number } } | null)?.taxCredit?.previousStoTotal ?? 0,
      ),
      showNamePublicly: !d.anonymous,
      emailReceipt: false,
    },
  };
}

// ── Fund guards (shared by edit and return) ──────────────────────────────────

/**
 * Refuse to take paid money out of a fund, or a campaign, that has already
 * awarded it. Awards are never reduced silently: a Super Admin reverses or
 * moves them on Allocation first.
 */
async function assertMoneyCanLeave(
  donationId: string,
  before: { fundingSource: string; amount: number }[],
  after: { fundingSource: string; amount: number }[],
  campaign: { id: string; title: string; change: number } | null,
) {
  const awards = await prisma.scholarshipAward.findMany({
    where: { donationId, status: { not: "reversed" } },
    select: { awardAmount: true },
  });
  const moving = before.some((b) => (after.find((a) => a.fundingSource === b.fundingSource)?.amount ?? 0) < b.amount - 0.004);
  if (awards.length && moving) {
    const total = round2(awards.reduce((s, a) => s + Number(a.awardAmount), 0));
    throw new ManualCheckError(
      `${awards.length} award${awards.length === 1 ? "" : "s"} ($${total.toFixed(2)}) draw directly on this check. Reverse ${awards.length === 1 ? "it" : "them"} on Allocation first. Nothing was changed.`,
      409,
      { awardsCount: awards.length, awardsTotal: total },
    );
  }

  const balances = await fundBalances();
  const delta = new Map<string, number>();
  for (const s of before) delta.set(s.fundingSource, (delta.get(s.fundingSource) ?? 0) - s.amount);
  for (const s of after) delta.set(s.fundingSource, (delta.get(s.fundingSource) ?? 0) + s.amount);
  for (const [source, change] of delta) {
    const fund = balances.find((b) => b.fundingSource === source);
    if (fund && change < 0 && fund.remaining + change < -0.005) {
      const label = isFundingSource(source) ? FUNDING_SOURCE_LABEL[source] : source;
      throw new ManualCheckError(
        `${label} has already awarded this money ($${fund.allocated.toFixed(2)} awarded of $${fund.received.toFixed(2)} received). Reverse or move awards on Allocation first. Nothing was changed.`,
        409,
      );
    }
  }

  if (campaign && campaign.change < 0) {
    const [paid, row] = await Promise.all([
      prisma.donation.aggregate({
        where: { campaignId: campaign.id, status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] },
        _sum: { amount: true },
      }),
      prisma.campaign.findUnique({ where: { id: campaign.id }, select: { awardedAmount: true } }),
    ]);
    const received = Number(paid._sum.amount ?? 0);
    const awarded = Number(row?.awardedAmount ?? 0);
    if (received + campaign.change < awarded - 0.005) {
      throw new ManualCheckError(
        `"${campaign.title}" has awarded $${awarded.toFixed(2)}; without this money it would have received only $${(received + campaign.change).toFixed(2)}. Reverse or move those awards on Allocation first. Nothing was changed.`,
        409,
      );
    }
  }
}

// ── Receipts ─────────────────────────────────────────────────────────────────

/** Void the live receipt with a reason and issue the next number in its place. */
async function reissueReceipt(donationId: string, reason: string, actor: ManualCheckActor) {
  const live = await prisma.taxReceipt.findFirst({ where: { donationId, status: { not: "void" } } });
  if (live) {
    await prisma.taxReceipt.update({
      where: { id: live.id },
      data: { status: "void", voidedAt: new Date(), voidedByEmail: actor.email, voidReason: reason },
    });
  }
  const d = await prisma.donation.findUnique({ where: { id: donationId }, select: { amount: true } });
  const next = await ensureTaxReceiptForDonation(donationId, Number(d?.amount ?? 0).toFixed(2));
  if (live) await prisma.taxReceipt.update({ where: { id: live.id }, data: { replacedById: next.id } });
  return { voided: live?.receiptNumber ?? null, issued: next };
}

// ── Edit ─────────────────────────────────────────────────────────────────────

export async function updateManualCheck(id: string, raw: ManualCheckInput & { reason?: unknown }, actor: ManualCheckActor) {
  const existing = await prisma.donation.findUnique({
    where: { id },
    include: { donationDetail: true, fundSplits: true, offlinePayment: true, campaign: { select: { id: true, title: true } } },
  });
  if (!existing?.offlinePayment) throw new ManualCheckError("This isn't a recorded check.", 404);
  if (existing.status !== "paid") throw new ManualCheckError(`This check is ${existing.status} and can't be edited.`, 409);

  const { value: v, warnings } = normalizeOrThrow(raw);
  const wasBusiness = existing.donationType === "business";
  if ((v.donorType === "business") !== wasBusiness) {
    throw new ManualCheckError("A check can't change between individual and business. Void it and record it again.", 400, { field: "donorType" });
  }
  if ((v.campaignId ?? null) !== (existing.campaignId ?? null)) {
    throw new ManualCheckError("To move a check to another campaign, void it and record it again.", 400, { field: "campaignId" });
  }
  const { campaign, recommendation } = await resolveRecommendation(v);
  await assertNoDuplicate(v, id);

  const dd = existing.donationDetail;
  const o = existing.offlinePayment;
  const beforeSplits = existing.fundSplits.map((s) => ({ fundingSource: s.fundingSource, amount: Number(s.amount) }));
  const oldAmount = Number(existing.amount);
  const amountChange = round2(v.amount - oldAmount);
  const splitsChanged =
    beforeSplits.length !== v.splits.length ||
    v.splits.some((s) => Math.abs((beforeSplits.find((b) => b.fundingSource === s.fundingSource)?.amount ?? -1) - s.amount) > 0.004);

  // What the receipt shows. A change to any of these after a receipt exists
  // needs a reason and re-issues the receipt (spec 5.6, 5.7).
  const name = (x: { first?: string | null; middle?: string | null; last?: string | null }) =>
    [x.first, x.middle, x.last].filter(Boolean).join(" ");
  const before = {
    donor: wasBusiness ? dd?.businessName ?? "" : name({ first: dd?.donorFirstName, middle: dd?.donorMiddleName, last: dd?.donorLastName }),
    ein: dd?.businessEin ?? null,
    address: [dd?.billingAddressLine1, dd?.billingAddressLine2, dd?.billingCity, dd?.billingState, dd?.billingZip].join("|"),
    amount: oldAmount,
    dateReceived: isoFromDateOnly(o.dateReceived),
    method: o.method,
    checkNumber: o.checkNumber,
    taxYear: existing.taxYear,
    filingStatus: dd?.filingStatus ?? null,
    splits: beforeSplits,
  };
  const after = {
    donor: receiptName(v),
    ein: v.ein,
    address: [v.addressLine1, v.addressLine2, v.city, v.state, v.zip].join("|"),
    amount: v.amount,
    dateReceived: v.dateReceived,
    method: v.method,
    checkNumber: v.checkNumber,
    taxYear: v.taxYear,
    filingStatus: v.filingStatus,
    splits: v.splits,
  };
  const receiptChanges = (Object.keys(before) as (keyof typeof before)[]).filter((k) =>
    k === "splits" ? splitsChanged : before[k] !== after[k] && !(before[k] == null && after[k] == null),
  );
  const liveReceipt = await prisma.taxReceipt.findFirst({ where: { donationId: id, status: { not: "void" } }, select: { id: true } });
  const reason = typeof raw.reason === "string" ? raw.reason.trim().slice(0, 500) : "";
  if (liveReceipt && receiptChanges.length && !reason) {
    throw new ManualCheckError(
      `A receipt has been issued. Say why ${receiptChanges.join(", ")} changed; the receipt will be voided and re-issued.`,
      400,
      { field: "reason", needsReason: true, receiptChanges },
    );
  }

  if (amountChange !== 0 || splitsChanged) {
    await assertMoneyCanLeave(
      id,
      beforeSplits,
      v.splits,
      existing.campaign ? { id: existing.campaign.id, title: existing.campaign.title, change: amountChange } : null,
    );
  }

  const metadata = await buildMetadata(v, campaign, recommendation, actor, id);
  const prevMeta = (existing.metadata ?? {}) as Record<string, unknown>;
  const amountUsd = v.amount.toFixed(2);
  const now = new Date();
  const taxYearOrFilingChanged = before.taxYear !== after.taxYear || before.filingStatus !== after.filingStatus;
  const rec = recommendationCreate(v, campaign, recommendation, actor);

  await prisma.$transaction(async (tx) => {
    await tx.donation.update({
      where: { id },
      data: {
        userId: v.linkUserId,
        amount: amountUsd,
        totalAmount: amountUsd,
        paymentProvider: v.method,
        anonymous: !v.showNamePublicly,
        taxYear: v.taxYear,
        ...(before.dateReceived !== v.dateReceived ? { createdAt: receivedAt(v.dateReceived) } : {}),
        metadata: { ...prevMeta, ...metadata, recordedByEmail: prevMeta.recordedByEmail ?? actor.email, lastEditedByEmail: actor.email },
      },
    });
    await tx.donationDetail.upsert({
      where: { donationId: id },
      create: { donationId: id, ...detailData(v), metadata },
      update: { ...detailData(v), metadata },
    });
    if (splitsChanged) {
      await tx.donationFundSplit.deleteMany({ where: { donationId: id } });
      await tx.donationFundSplit.createMany({
        data: v.splits.map((s) => ({
          donationId: id,
          fundingSource: s.fundingSource,
          amount: s.amount,
          status: "confirmed",
          setBy: actor.id,
          setByEmail: actor.email,
          note: reason || "Edited on the recorded check.",
        })),
      });
    }
    // Recommendations are non-binding inputs to allocation; replace them as entered.
    await tx.donorRecommendedStudent.deleteMany({ where: { donationId: id } });
    await tx.donorRecommendation.deleteMany({ where: { donationId: id } });
    if (rec) await tx.donorRecommendation.create({ data: { donationId: id, ...rec } });
    if (recommendation.studentIds.length) {
      await tx.donorRecommendedStudent.createMany({ data: recommendation.studentIds.map((studentId) => ({ donationId: id, studentId })) });
    }
    if (amountChange !== 0 && existing.campaignId) {
      await tx.$executeRaw`
        UPDATE "campaigns" SET "raised_amount" = GREATEST(0, "raised_amount" + ${amountChange})
         WHERE "id" = ${existing.campaignId}::uuid`;
      await tx.donationAllocation.updateMany({ where: { donationId: id, allocationType: "campaign" }, data: { amount: amountUsd } });
      await tx.campaignBacker.updateMany({ where: { donationId: id }, data: { amount: amountUsd } });
    }
    await tx.campaignBacker.updateMany({ where: { donationId: id }, data: { isAnonymous: !v.showNamePublicly } });
    await tx.donationOfflinePayment.update({
      where: { donationId: id },
      data: {
        method: v.method,
        checkNumber: v.checkNumber,
        drawerName: v.drawerName,
        checkDate: dateOnly(v.checkDate),
        dateReceived: dateOnly(v.dateReceived)!,
        dateDeposited: dateOnly(v.dateDeposited),
        internalNotes: v.internalNotes,
        ...(taxYearOrFilingChanged || v.taxYearConfirmation !== o.taxYearConfirmation
          ? { taxYearConfirmation: v.taxYearConfirmation, taxYearConfirmedAt: v.taxYearConfirmation ? now : null }
          : {}),
        ...(v.relationshipAck && !o.relationshipAckAt
          ? { relationshipAckMethod: v.relationshipAckMethod, relationshipAckByEmail: actor.email, relationshipAckAt: now }
          : !v.relationshipAck
            ? { relationshipAckMethod: null, relationshipAckByEmail: null, relationshipAckAt: null }
            : { relationshipAckMethod: v.relationshipAckMethod }),
      },
    });
  });

  let reissued: { voided: string | null; issued: { id: string; receiptNumber: string } } | null = null;
  if (liveReceipt && receiptChanges.length) {
    reissued = await reissueReceipt(id, reason, actor);
  } else if (!liveReceipt) {
    reissued = { voided: null, issued: await ensureTaxReceiptForDonation(id, amountUsd) };
  }
  const emailed = v.emailReceipt && reissued ? await sendDonationReceiptEmail(id) : false;

  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "donation.manual_check_edit",
    entityType: "donation",
    entityId: id,
    before,
    after: {
      ...auditSummary(v),
      reason: reason || null,
      receiptChanges,
      voidedReceipt: reissued?.voided ?? null,
      issuedReceipt: reissued?.issued.receiptNumber ?? null,
      emailed,
    },
  });

  return { donationId: id, warnings, receiptChanges, reissued: reissued ? { voided: reissued.voided, issued: reissued.issued.receiptNumber } : null, emailed };
}

// ── Returned (NSF) or void ───────────────────────────────────────────────────

/**
 * A check that bounced ("returned") or was entered in error ("void"). Takes it
 * out of every total, voids its receipt, and refuses if its money has already
 * been awarded — that needs a Super Admin to reverse the awards first, so no
 * award is ever reduced without a decision. Never deletes the record.
 */
export async function returnManualCheck(
  id: string,
  input: { kind?: unknown; reason?: unknown },
  actor: ManualCheckActor,
) {
  const kind = input.kind === "void" ? "void" : input.kind === "returned" ? "returned" : null;
  if (!kind) throw new ManualCheckError("Choose Returned or Void.", 400);
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  if (!reason) throw new ManualCheckError("Say why.", 400, { field: "reason" });

  const d = await prisma.donation.findUnique({
    where: { id },
    include: { fundSplits: true, offlinePayment: true, campaign: { select: { id: true, title: true } }, taxReceipts: true },
  });
  if (!d?.offlinePayment) throw new ManualCheckError("This isn't a recorded check.", 404);
  if (d.status !== "paid") throw new ManualCheckError(`This check is already ${d.status}.`, 409);

  const splits = d.fundSplits.map((s) => ({ fundingSource: s.fundingSource, amount: Number(s.amount) }));
  const amount = Number(d.amount);
  await assertMoneyCanLeave(id, splits, [], d.campaign ? { id: d.campaign.id, title: d.campaign.title, change: -amount } : null);

  const now = new Date();
  const voided = d.taxReceipts.filter((r) => r.status !== "void").map((r) => r.receiptNumber);
  await prisma.$transaction(async (tx) => {
    const flipped = await tx.donation.updateMany({ where: { id, status: "paid" }, data: { status: kind } });
    if (flipped.count === 0) throw new ManualCheckError("This check was changed by someone else. Reload and try again.", 409);
    await tx.donationOfflinePayment.update({
      where: { donationId: id },
      data: { returnedAt: now, returnedReason: reason, returnedByEmail: actor.email },
    });
    await tx.taxReceipt.updateMany({
      where: { donationId: id, status: { not: "void" } },
      data: { status: "void", voidedAt: now, voidedByEmail: actor.email, voidReason: `${kind === "returned" ? "Check returned" : "Entry voided"}: ${reason}` },
    });
    if (d.campaignId) {
      await tx.$executeRaw`
        UPDATE "campaigns"
           SET "raised_amount" = GREATEST(0, "raised_amount" - ${amount}),
               "donor_count" = GREATEST(0, "donor_count" - 1)
         WHERE "id" = ${d.campaignId}::uuid`;
    }
    await tx.donationAllocation.deleteMany({ where: { donationId: id, allocationType: "campaign" } });
    await tx.campaignBacker.updateMany({ where: { donationId: id }, data: { status: "removed" } });
  });

  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: kind === "returned" ? "donation.manual_check_returned" : "donation.manual_check_void",
    entityType: "donation",
    entityId: id,
    before: { status: "paid", amount, splits, receipts: voided },
    after: { status: kind, reason, voidedReceipts: voided },
  });

  return { donationId: id, status: kind, voidedReceipts: voided };
}
