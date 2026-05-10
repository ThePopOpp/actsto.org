import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder } from "@/lib/paypal/client";
import { logPaypalPaymentEvent } from "@/lib/paypal/payment-records";

/**
 * POST /api/paypal/create-order
 *
 * Creates a pending Donation record and a PayPal order.
 * Returns { orderId, donationId } so the frontend can drive the PayPal Buttons flow.
 *
 * Body: {
 *   amount: string (e.g. "250.00"),
 *   donationType?: "quick" | "tax_credit",
 *   campaignId?: string (UUID),
 *   campaignSlug?: string,
 *   anonymous?: boolean,
 *   donorMessage?: string,
 * }
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
  if (!["quick", "tax_credit"].includes(donationType)) {
    return NextResponse.json({ error: "Unsupported donation type." }, { status: 400 });
  }

  const campaignSlug = body.campaignSlug?.trim() || null;
  const campaignTitle = body.campaignTitle?.trim() || null;
  const campaignId = body.campaignId ?? (campaignSlug ? await getCampaignIdBySlug(campaignSlug) : null);
  const anonymous = body.anonymous ?? false;
  const donorMessage = body.donorMessage?.trim() ?? null;
  const taxCredit = donationType === "tax_credit" ? normalizeTaxCreditPayload(body.taxCredit) : null;

  if (donationType === "tax_credit" && !taxCredit) {
    return NextResponse.json({ error: "Tax credit donation details are required." }, { status: 400 });
  }
  if (taxCredit && (!taxCredit.termsAccepted || !taxCredit.privacyConsent)) {
    return NextResponse.json({ error: "Required tax credit consents are missing." }, { status: 400 });
  }
  if (taxCredit?.designateStudent && !taxCredit.relationshipAck) {
    return NextResponse.json({ error: "Relationship policy acknowledgement is required." }, { status: 400 });
  }

  // Attach session userId if logged in (optional for anonymous donations)
  const session = await getActSession().catch(() => null);
  const userId = session?.email ? await getUserIdByEmail(session.email) : null;
  let donationId: string | null = null;

  try {
    const recommendation = taxCredit
      ? await getRecommendationTargets({
          campaignId,
          campaignSlug,
          studentId: taxCredit.studentId,
          schoolId: taxCredit.schoolId,
        })
      : null;
    const metadata: Prisma.InputJsonObject = {
      campaignSlug,
      campaignTitle,
      ...(taxCredit
        ? {
            taxCredit: {
              designateStudent: taxCredit.designateStudent,
              selectedCampaignSlug: taxCredit.campaignSlug,
              selectedCampaignTitle: taxCredit.campaignTitle,
              selectedStudentName: [taxCredit.studentFirstName, taxCredit.studentLastName]
                .filter(Boolean)
                .join(" ")
                .trim(),
              selectedSchoolName: taxCredit.schoolName,
              grade: taxCredit.grade,
              creditLimit: taxCredit.creditLimit,
              eligibleCredit: taxCredit.eligibleCredit,
              previousStoTotal: taxCredit.previousStoTotal,
              priorActDonationsThisYear: taxCredit.priorActDonationsThisYear,
              relationshipAck: taxCredit.relationshipAck,
              termsAccepted: taxCredit.termsAccepted,
              privacyConsent: taxCredit.privacyConsent,
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
        taxYear: taxCredit?.taxYear ?? null,
        metadata,
        donationDetail: taxCredit
          ? {
              create: {
                donorFirstName: taxCredit.donorFirstName,
                donorMiddleName: taxCredit.donorMiddleName,
                donorLastName: taxCredit.donorLastName,
                donorEmail: taxCredit.donorEmail,
                donorPhone: taxCredit.donorPhone,
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
        donorRecommendation:
          taxCredit && taxCredit.designateStudent
            ? {
                create: {
                  recommendedCampaignId: recommendation?.campaignId ?? null,
                  recommendedStudentId: recommendation?.studentId ?? null,
                  recommendedSchoolId: recommendation?.schoolId ?? null,
                  relationshipDisclosure: taxCredit.relationshipAck
                    ? "Donor acknowledged relationship and dependent-benefit policy."
                    : "Relationship acknowledgement not completed.",
                  isDependentOfDonor: false,
                  complianceStatus: taxCredit.relationshipAck ? "pending" : "needs_review",
                },
              }
            : undefined,
      },
    });
    donationId = donation.id;

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
      where: { email: email.toLowerCase() },
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
  studentId?: string | null;
  schoolId?: string | null;
  studentFirstName?: string;
  studentLastName?: string;
  schoolName?: string;
  grade?: string;
  relationshipAck?: boolean;
  termsAccepted?: boolean;
  privacyConsent?: boolean;
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
    studentId: clean(payload.studentId) || null,
    schoolId: clean(payload.schoolId) || null,
    studentFirstName: clean(payload.studentFirstName) || null,
    studentLastName: clean(payload.studentLastName) || null,
    schoolName: clean(payload.schoolName) || null,
    grade: clean(payload.grade) || null,
    relationshipAck: payload.relationshipAck === true,
    termsAccepted: payload.termsAccepted === true,
    privacyConsent: payload.privacyConsent === true,
    creditLimit: safeNumber(payload.creditLimit),
    eligibleCredit: safeNumber(payload.eligibleCredit),
    previousStoTotal: safeNumber(payload.previousStoTotal),
    priorActDonationsThisYear: safeNumber(payload.priorActDonationsThisYear),
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function getRecommendationTargets({
  campaignId,
  campaignSlug,
  studentId,
  schoolId,
}: {
  campaignId: string | null;
  campaignSlug: string | null;
  studentId: string | null;
  schoolId: string | null;
}) {
  if (campaignId) {
    const campaign = await prisma.campaign
      .findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          schoolId: true,
          campaignStudents: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { studentId: true, student: { select: { schoolId: true } } },
          },
        },
      })
      .catch(() => null);

    return {
      campaignId,
      studentId: studentId || campaign?.campaignStudents[0]?.studentId || null,
      schoolId: schoolId || campaign?.campaignStudents[0]?.student.schoolId || campaign?.schoolId || null,
    };
  }

  if (campaignSlug) {
    const campaign = await prisma.campaign
      .findUnique({
        where: { slug: campaignSlug },
        select: {
          id: true,
          schoolId: true,
          campaignStudents: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { studentId: true, student: { select: { schoolId: true } } },
          },
        },
      })
      .catch(() => null);

    if (campaign) {
      return {
        campaignId: campaign.id,
        studentId: studentId || campaign.campaignStudents[0]?.studentId || null,
        schoolId: schoolId || campaign.campaignStudents[0]?.student.schoolId || campaign.schoolId || null,
      };
    }
  }

  return { campaignId: null, studentId: studentId || null, schoolId: schoolId || null };
}
