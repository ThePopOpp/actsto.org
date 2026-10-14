import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getActSession } from "@/lib/auth/session-server";
import { RELATIONSHIP_ACK_TEXT, sanitizeRecommendation } from "@/lib/donations/recommendations";
import { isCorporateProgram, splitIndividualGift } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder, getPaypalEnv } from "@/lib/paypal/client";
import { logPaypalPaymentEvent } from "@/lib/paypal/payment-records";
import { recordSmsConsent, smsConsentRequestMetadata } from "@/lib/sms/consent";
import { getOriginalOverflowForYear } from "@/lib/tax-credit";
import { getTaxCreditLimitConfig } from "@/lib/tax-credit-limits-server";
import { normalizePhone } from "@/lib/sms/twilio";

/**
 * POST /api/paypal/create-order
 *
 * Creates a pending Donation record and a PayPal order.
 * Returns { orderId, donationId } so the frontend can drive the PayPal Buttons flow.
 *
 * Body: {
 *   amount: string (e.g. "250.00"),
 *   donationType?: "quick" | "tax_credit" | "business",
 *   campaignId?: string (UUID),
 *   campaignSlug?: string,
 *   anonymous?: boolean,
 *   donorMessage?: string,
 *   taxCredit?: individual donor, filing status, recommended student ids
 *   business?: business name, EIN, contact, program, recommended school
 * }
 *
 * Every donation gets its funding-source split here. Recommendations are
 * sanitized here too: corporate gifts never link a student, and a student can
 * only be recommended from the campaign's own list.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    amount?: string;
    donationType?: string;
    campaignId?: string;
    campaignSlug?: string;
    campaignTitle?: string;
    anonymous?: boolean;
    donorMessage?: string;
    taxCredit?: TaxCreditPayload;
    business?: BusinessPayload;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amountRaw = String(body.amount ?? "").replace(/[^0-9.]/g, "");
  const amount = parseFloat(amountRaw);

  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Amount must be at least $1.00." }, { status: 400 });
  }

  const amountUsd = amount.toFixed(2);
  const donationType = body.donationType ?? "quick";
  if (!["quick", "tax_credit", "business"].includes(donationType)) {
    return NextResponse.json({ error: "Unsupported donation type." }, { status: 400 });
  }

  const campaignSlug = body.campaignSlug?.trim() || null;
  const campaignTitle = body.campaignTitle?.trim() || null;
  const campaignId = body.campaignId ?? (campaignSlug ? await getCampaignIdBySlug(campaignSlug) : null);
  const anonymous = body.anonymous ?? false;
  const donorMessage = body.donorMessage?.trim() ?? null;
  const taxCredit = donationType === "tax_credit" ? normalizeTaxCreditPayload(body.taxCredit) : null;
  const business = donationType === "business" ? normalizeBusinessPayload(body.business) : null;

  if (donationType === "tax_credit" && !taxCredit) {
    return NextResponse.json({ error: "Tax credit donation details are required." }, { status: 400 });
  }
  if (donationType === "business") {
    if (!business || "error" in business) {
      return NextResponse.json(
        { error: business && "error" in business ? business.error : "Business donation details are required." },
        { status: 400 },
      );
    }
  }
  const corporate = business && !("error" in business) ? business : null;
  const consents = taxCredit ?? corporate;
  if (consents && (!consents.termsAccepted || !consents.privacyConsent)) {
    return NextResponse.json({ error: "Required tax credit consents are missing." }, { status: 400 });
  }

  const session = await getActSession().catch(() => null);

  // Who the gift may recommend is decided here, not by the form: only students
  // actually on the campaign, never a student on a corporate gift — or from a
  // session signed in as a business donor, whichever form it used — and nobody
  // at all when the donor answered No (the campaign attribution stays).
  const campaignStudentIds = campaignId ? await getCampaignStudentIds(campaignId) : [];
  const recommendation = sanitizeRecommendation({
    corporate: Boolean(corporate) || session?.role === "donor_business",
    designate: Boolean(taxCredit?.designateStudent),
    studentIds: taxCredit?.recommendedStudentIds ?? [],
    campaignStudentIds,
    schoolId: corporate ? corporate.schoolId : null,
  });
  if (recommendation.relationshipAckRequired && !taxCredit?.relationshipAck) {
    return NextResponse.json({ error: "Relationship policy acknowledgement is required." }, { status: 400 });
  }
  if (corporate?.schoolId && !(await schoolExists(corporate.schoolId))) {
    return NextResponse.json({ error: "Choose a school from the list." }, { status: 400 });
  }

  // Attach session userId if logged in (optional for anonymous donations)
  const userId = session?.email ? await getUserIdByEmail(session.email) : null;
  let donationId: string | null = null;

  try {
    // The limits in force when the gift was made, looked up here rather than
    // taken from the browser, so the receipt can show them even if the year's
    // limits are edited later.
    const limitConfig = await getTaxCreditLimitConfig();
    const limitsAtGift = taxCredit
      ? getOriginalOverflowForYear(String(taxCredit.taxYear), limitConfig)[
          taxCredit.filingStatus === "married" ? "married" : "single"
        ]
      : null;

    // Which program the dollars belong to, fixed at the moment of the gift.
    // Corporate: the program the business chose. Tax-credit: Original up to
    // the donor's remaining Original limit, Overflow after. Quick gifts carry
    // no filing status or prior gifts, so they assume a single filer with no
    // prior gifts, and any Overflow part is flagged for an admin to confirm.
    const quickLimits = donationType === "quick" ? getOriginalOverflowForYear(String(new Date().getFullYear()), limitConfig).single : null;
    const fundSplits = corporate
      ? [{ fundingSource: corporate.program as string, amount: Number(amountUsd), status: "confirmed" }]
      : taxCredit && limitsAtGift
        ? splitIndividualGift(
            Number(amountUsd),
            limitsAtGift.original,
            taxCredit.previousStoTotal + taxCredit.priorActDonationsThisYear,
          ).map((part) => ({ ...part, status: "confirmed" }))
        : splitIndividualGift(Number(amountUsd), quickLimits?.original ?? Number(amountUsd), 0).map((part) => ({
            ...part,
            status: part.fundingSource === "individual_overflow" ? "needs_review" : "confirmed",
          }));

    const campaignSchool = campaignId
      ? await prisma.campaign
          .findUnique({ where: { id: campaignId }, select: { schoolId: true } })
          .then((c) => c?.schoolId ?? null)
          .catch(() => null)
      : null;
    const metadata: Prisma.InputJsonObject = {
      // Which PayPal environment took this payment. Sandbox money must never
      // count toward a campaign's public raised total, and once a donation is
      // recorded there is otherwise no way to tell the two apart.
      paypalEnvironment: getPaypalEnv(),
      campaignSlug,
      campaignTitle,
      ...(corporate
        ? {
            business: {
              program: corporate.program,
              recommendedSchoolId: corporate.schoolId,
              adorPreApproval: corporate.adorPreApproval,
              termsAccepted: corporate.termsAccepted,
              privacyConsent: corporate.privacyConsent,
            },
          }
        : {}),
      ...(taxCredit
        ? {
            taxCredit: {
              designateStudent: recommendation.studentIds.length > 0,
              selectedCampaignSlug: taxCredit.campaignSlug,
              selectedCampaignTitle: taxCredit.campaignTitle,
              recommendedStudentIds: recommendation.studentIds,
              creditLimit: taxCredit.creditLimit,
              eligibleCredit: taxCredit.eligibleCredit,
              previousStoTotal: taxCredit.previousStoTotal,
              priorActDonationsThisYear: taxCredit.priorActDonationsThisYear,
              ...(limitsAtGift
                ? {
                    limitsAtGift: {
                      original: limitsAtGift.original,
                      overflow: limitsAtGift.overflow,
                      combined: limitsAtGift.combined,
                    },
                  }
                : {}),
              relationshipAck: taxCredit.relationshipAck,
              // What the donor agreed to and when, kept with the gift.
              ...(recommendation.relationshipAckRequired && taxCredit.relationshipAck
                ? { relationshipAckText: RELATIONSHIP_ACK_TEXT, relationshipAckAt: new Date().toISOString() }
                : {}),
              termsAccepted: taxCredit.termsAccepted,
              privacyConsent: taxCredit.privacyConsent,
              smsConsent: taxCredit.smsConsent,
            },
          }
        : {}),
    };

    // 1. Create pending Donation row
    const donation = await prisma.donation.create({
      data: {
        userId,
        campaignId,
        amount: amountUsd,
        totalAmount: amountUsd,
        donationType,
        status: "pending",
        paymentProvider: "paypal",
        anonymous,
        donorMessage,
        taxYear: taxCredit?.taxYear ?? corporate?.taxYear ?? null,
        metadata,
        fundSplits: {
          create: fundSplits.map((split) => ({
            fundingSource: split.fundingSource,
            amount: split.amount,
            status: split.status,
            note: split.status === "needs_review" ? "Quick gift: filing status and prior gifts unknown." : null,
          })),
        },
        donationDetail: corporate
          ? {
              create: {
                donorFirstName: corporate.contactFirstName,
                donorLastName: corporate.contactLastName,
                donorEmail: corporate.email,
                donorPhone: corporate.phone,
                donorPhoneNormalized: corporate.phone ? normalizePhone(corporate.phone) : null,
                billingAddressLine1: corporate.addressLine1,
                billingAddressLine2: corporate.addressLine2,
                billingCity: corporate.city,
                billingState: corporate.state,
                billingZip: corporate.zip,
                taxYear: corporate.taxYear,
                wantsTaxReceipt: true,
                businessName: corporate.businessName,
                businessEin: corporate.ein,
                businessContactTitle: corporate.contactTitle,
                publicDisplayName: corporate.businessName,
                showNamePublicly: !anonymous,
                showAmountPublicly: false,
                metadata,
              },
            }
          : taxCredit
          ? {
              create: {
                donorFirstName: taxCredit.donorFirstName,
                donorMiddleName: taxCredit.donorMiddleName,
                donorLastName: taxCredit.donorLastName,
                donorEmail: taxCredit.donorEmail,
                donorPhone: taxCredit.donorPhone,
                donorPhoneNormalized: taxCredit.donorPhone ? normalizePhone(taxCredit.donorPhone) : null,
                billingAddressLine1: taxCredit.billingAddressLine1,
                billingAddressLine2: taxCredit.billingAddressLine2,
                billingCity: taxCredit.billingCity,
                billingState: taxCredit.billingState,
                billingZip: taxCredit.billingZip,
                taxYear: taxCredit.taxYear,
                filingStatus: taxCredit.filingStatus,
                isArizonaResident: true,
                wantsTaxReceipt: true,
                publicDisplayName:
                  [taxCredit.donorFirstName, taxCredit.donorLastName].filter(Boolean).join(" ").trim() || null,
                showNamePublicly: !anonymous,
                showAmountPublicly: false,
                metadata,
              },
            }
          : undefined,
        // Non-binding: an input to allocation only. Corporate gifts recommend
        // a school; individual gifts the campaign's students the donor kept.
        donorRecommendation:
          recommendation.studentIds.length > 0 || recommendation.schoolId
            ? {
                create: {
                  recommendedCampaignId: campaignId,
                  recommendedStudentId: recommendation.studentIds[0] ?? null,
                  recommendedSchoolId: recommendation.schoolId ?? (recommendation.studentIds.length ? campaignSchool : null),
                  relationshipDisclosure: corporate
                    ? "Corporate gift: school recommendation only."
                    : `Acknowledged ${new Date().toISOString()}: ${RELATIONSHIP_ACK_TEXT}`,
                  isDependentOfDonor: false,
                  complianceStatus: "pending",
                },
              }
            : undefined,
        recommendedStudents: recommendation.studentIds.length
          ? { create: recommendation.studentIds.map((studentId) => ({ studentId })) }
          : undefined,
      },
    });
    donationId = donation.id;

    const consentSource = taxCredit
      ? { smsConsent: taxCredit.smsConsent, email: taxCredit.donorEmail, phone: taxCredit.donorPhone, form: "Tax Credit Donation" }
      : corporate
        ? { smsConsent: corporate.smsConsent, email: corporate.email, phone: corporate.phone, form: "Corporate Tax Credit Donation" }
        : null;
    if (consentSource) {
      await recordSmsConsent({
        smsOptIn: consentSource.smsConsent,
        source: "donation_tax_credit",
        formName: consentSource.form,
        copyKey: "universal",
        userId,
        email: consentSource.email,
        phone: consentSource.phone,
        ...smsConsentRequestMetadata(req),
        metadata: {
          donationId: donation.id,
          donationType,
          campaignSlug,
          campaignTitle,
        },
      });
    }

    // 2. Create PayPal order
    const { orderId } = await createPaypalOrder(amountUsd);

    // 3. Link the PayPal order ID to the donation
    await prisma.donation.update({
      where: { id: donation.id },
      data: { paymentProviderOrderId: orderId },
    });

    return NextResponse.json({ orderId, donationId: donation.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create order.";
    if (donationId) {
      await prisma.donation
        .update({
          where: { id: donationId },
          data: { status: "failed" },
        })
        .catch(() => undefined);
      await logPaypalPaymentEvent({
        donationId,
        orderId: null,
        captureId: null,
        eventType: "CHECKOUT.ORDER.CREATE.FAILED",
        payload: { error: msg },
        processed: true,
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function getCampaignIdBySlug(slug: string): Promise<string | null> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: { id: true },
    });
    return campaign?.id ?? null;
  } catch {
    return null;
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const profile = await prisma.profile.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

type TaxCreditPayload = {
  donorFirstName?: string;
  donorMiddleName?: string;
  donorLastName?: string;
  donorEmail?: string;
  donorPhone?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  taxYear?: string | number;
  filingStatus?: string;
  designateStudent?: boolean;
  campaignId?: string | null;
  campaignSlug?: string | null;
  campaignTitle?: string | null;
  /** Students picked from the campaign's own list. Free-text names are not accepted. */
  recommendedStudentIds?: unknown;
  relationshipAck?: boolean;
  termsAccepted?: boolean;
  privacyConsent?: boolean;
  smsConsent?: boolean;
  creditLimit?: number;
  eligibleCredit?: number;
  previousStoTotal?: number;
  priorActDonationsThisYear?: number;
};

function normalizeTaxCreditPayload(payload: TaxCreditPayload | undefined | null) {
  if (!payload) return null;
  const donorFirstName = clean(payload.donorFirstName);
  const donorLastName = clean(payload.donorLastName);
  const donorEmail = clean(payload.donorEmail).toLowerCase();
  const taxYear = Number(payload.taxYear);

  if (!donorFirstName || !donorLastName || !donorEmail || !Number.isInteger(taxYear)) {
    return null;
  }

  return {
    donorFirstName,
    donorMiddleName: clean(payload.donorMiddleName) || null,
    donorLastName,
    donorEmail,
    donorPhone: clean(payload.donorPhone) || null,
    billingAddressLine1: clean(payload.billingAddressLine1) || null,
    billingAddressLine2: clean(payload.billingAddressLine2) || null,
    billingCity: clean(payload.billingCity) || null,
    billingState: clean(payload.billingState) || null,
    billingZip: clean(payload.billingZip) || null,
    taxYear,
    filingStatus: clean(payload.filingStatus) || null,
    designateStudent: payload.designateStudent === true,
    campaignId: clean(payload.campaignId) || null,
    campaignSlug: clean(payload.campaignSlug) || null,
    campaignTitle: clean(payload.campaignTitle) || null,
    recommendedStudentIds: Array.isArray(payload.recommendedStudentIds)
      ? payload.recommendedStudentIds.filter((id): id is string => typeof id === "string").slice(0, 50)
      : [],
    relationshipAck: payload.relationshipAck === true,
    termsAccepted: payload.termsAccepted === true,
    privacyConsent: payload.privacyConsent === true,
    smsConsent: payload.smsConsent === true,
    creditLimit: safeNumber(payload.creditLimit),
    eligibleCredit: safeNumber(payload.eligibleCredit),
    previousStoTotal: safeNumber(payload.previousStoTotal),
    priorActDonationsThisYear: safeNumber(payload.priorActDonationsThisYear),
  };
}

type BusinessPayload = {
  businessName?: string;
  ein?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  taxYear?: string | number;
  program?: string;
  schoolId?: string | null;
  adorPreApproval?: string;
  termsAccepted?: boolean;
  privacyConsent?: boolean;
  smsConsent?: boolean;
  /** Never accepted: a corporate gift can't name a student. Read only to refuse it. */
  recommendedStudentIds?: unknown;
};

/**
 * A corporate gift: the business as its legal entity, its contact, and the
 * required program choice. No filing status and no individual credit limits.
 */
function normalizeBusinessPayload(payload: BusinessPayload | undefined | null) {
  if (!payload) return null;
  const businessName = clean(payload.businessName);
  const einDigits = clean(payload.ein).replace(/\D/g, "");
  const contactFirstName = clean(payload.contactFirstName);
  const contactLastName = clean(payload.contactLastName);
  const email = clean(payload.email).toLowerCase();
  const taxYear = Number(payload.taxYear);

  if (!businessName) return { error: "Enter the business's legal name." };
  if (einDigits.length !== 9) return { error: "Enter the business's 9-digit EIN." };
  if (!contactFirstName || !contactLastName || !email) {
    return { error: "Enter a contact name and email for the business." };
  }
  if (!isCorporateProgram(payload.program)) {
    return { error: "Choose the program this gift supports: low-income, or disabled/displaced." };
  }
  if (!Number.isInteger(taxYear)) return { error: "Choose a tax year." };
  if (Array.isArray(payload.recommendedStudentIds) && payload.recommendedStudentIds.length > 0) {
    return { error: "A corporate gift can recommend a school, not a student." };
  }

  return {
    businessName,
    ein: `${einDigits.slice(0, 2)}-${einDigits.slice(2)}`,
    contactFirstName,
    contactLastName,
    contactTitle: clean(payload.contactTitle) || null,
    email,
    phone: clean(payload.phone) || null,
    addressLine1: clean(payload.addressLine1) || null,
    addressLine2: clean(payload.addressLine2) || null,
    city: clean(payload.city) || null,
    state: clean(payload.state) || null,
    zip: clean(payload.zip) || null,
    taxYear,
    program: payload.program,
    schoolId: clean(payload.schoolId) || null,
    adorPreApproval: clean(payload.adorPreApproval).slice(0, 80) || null,
    termsAccepted: payload.termsAccepted === true,
    privacyConsent: payload.privacyConsent === true,
    smsConsent: payload.smsConsent === true,
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Live students on the campaign: the only ones a donor may recommend through it. */
async function getCampaignStudentIds(campaignId: string): Promise<string[]> {
  const rows = await prisma.campaignStudent
    .findMany({
      where: { campaignId, campaign: { isSchoolLevel: false }, student: { status: { not: "archived" } } },
      select: { studentId: true },
    })
    .catch(() => []);
  return rows.map((row) => row.studentId);
}

async function schoolExists(schoolId: string): Promise<boolean> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } }).catch(() => null);
  return Boolean(school);
}
