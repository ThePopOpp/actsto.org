import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import {
  TaxReceiptDocument,
  type TaxCreditBreakdown,
  type TaxReceiptPdfData,
} from "@/components/receipts/tax-receipt-pdf";
import { streamToBuffer } from "@/lib/admin/invoices";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { getOriginalOverflowForYear } from "@/lib/tax-credit";
import { getTaxCreditLimitConfig } from "@/lib/tax-credit-limits-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let logoCache: Promise<Buffer | null> | null = null;

/** The PNG wordmark from /public; a receipt still renders if it is missing. */
function receiptLogo() {
  logoCache ??= readFile(path.join(process.cwd(), "public", "actsto-logo-light.png")).catch(() => null);
  return logoCache;
}

function phoenixDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function usd(value: unknown) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(n) ? n : 0);
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * The donation form's "Tax Credit Breakdown" and "Final summary", rebuilt from
 * what checkout saved on the donation. Limits come from the snapshot taken at
 * checkout (limitsAtGift); gifts made before that was recorded fall back to
 * the year's limits as currently configured, with the saved combined limit.
 */
async function buildBreakdown(args: {
  taxYear: string;
  total: number;
  filingStatus: string | null;
  taxCredit: Record<string, unknown>;
}): Promise<TaxCreditBreakdown> {
  const { taxYear, total, taxCredit } = args;
  const filing = args.filingStatus === "married" ? "married" : "single";
  const snapshot = (taxCredit.limitsAtGift ?? null) as Record<string, unknown> | null;
  const configured = getOriginalOverflowForYear(taxYear, await getTaxCreditLimitConfig())[filing];

  const original = num(snapshot?.original) ?? configured.original;
  const overflow = num(snapshot?.overflow) ?? configured.overflow;
  const combined = num(snapshot?.combined) ?? num(taxCredit.creditLimit) ?? configured.combined;
  const otherSto = Math.max(0, num(taxCredit.previousStoTotal) ?? 0);
  const earlierAct = Math.max(0, num(taxCredit.priorActDonationsThisYear) ?? 0);
  const creditThisYear = Math.min(
    total,
    num(taxCredit.eligibleCredit) ?? Math.max(0, combined - otherSto - earlierAct),
  );

  return {
    taxYear,
    totalDonation: usd(total),
    creditThisYear: usd(creditThisYear),
    futureCredit: usd(Math.max(0, total - creditThisYear)),
    filingStatus: filing === "married" ? "Married filing jointly" : "Single / head of household",
    original: usd(original),
    overflow: usd(overflow),
    combined: usd(combined),
    otherStoGifts: usd(otherSto),
    earlierActGifts: usd(earlierAct),
  };
}

function giftTypeLabel(donationType: string) {
  switch (donationType) {
    case "tax_credit":
      return "Arizona individual tax credit";
    case "business":
      return "Business contribution";
    case "manual_check":
      return "Check";
    default:
      return "Donation";
  }
}

/**
 * GET /api/receipts/:id/pdf
 *
 * The receipt as a PDF, rendered on request from the receipt and donation rows,
 * so there is no stored file to drift out of date. Super Admins may open any
 * receipt; anyone else only receipts for their own gifts, matched by account or
 * by the email the gift was made with.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in to view receipts." }, { status: 401 });

  const { id } = await params;
  const receipt = await prisma.taxReceipt
    .findUnique({
      where: { id },
      include: {
        donation: {
          include: {
            donationDetail: true,
            campaign: { select: { title: true } },
          },
        },
      },
    })
    .catch(() => null);
  if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });

  const donation = receipt.donation;
  const detail = donation.donationDetail;

  if (session.role !== "super_admin") {
    const email = session.email.toLowerCase();
    const profile = await prisma.profile
      .findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })
      .catch(() => null);
    const owns =
      (profile && donation.userId === profile.id) ||
      receipt.issuedToEmail?.toLowerCase() === email ||
      detail?.donorEmail?.toLowerCase() === email;
    // Not found rather than forbidden, so receipt ids cannot be probed.
    if (!owns) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const ownerProfile =
    !detail && donation.userId
      ? await prisma.profile
          .findUnique({ where: { id: donation.userId }, select: { fullName: true, displayName: true, email: true } })
          .catch(() => null)
      : null;

  const detailName = [detail?.donorFirstName, detail?.donorMiddleName, detail?.donorLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cityLine = [detail?.billingCity, [detail?.billingState, detail?.billingZip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const metadata = (donation.metadata ?? {}) as Record<string, unknown>;
  const metaTitle = typeof metadata.campaignTitle === "string" ? metadata.campaignTitle : null;

  const taxYear = String(receipt.taxYear ?? donation.taxYear ?? donation.createdAt.getFullYear());
  const total = Number(receipt.amount ?? donation.totalAmount ?? donation.amount ?? 0);
  const taxCreditMeta =
    metadata.taxCredit && typeof metadata.taxCredit === "object"
      ? (metadata.taxCredit as Record<string, unknown>)
      : null;
  const breakdown =
    donation.donationType === "tax_credit"
      ? await buildBreakdown({
          taxYear,
          total,
          filingStatus: detail?.filingStatus ?? null,
          taxCredit: taxCreditMeta ?? {},
        })
      : null;

  const data: TaxReceiptPdfData = {
    receiptNumber: receipt.receiptNumber,
    issuedAt: phoenixDate(receipt.issuedAt ?? receipt.createdAt),
    giftDate: phoenixDate(donation.createdAt),
    donorName:
      receipt.issuedToName || detailName || ownerProfile?.fullName || ownerProfile?.displayName || "Donor",
    donorEmail: receipt.issuedToEmail ?? detail?.donorEmail ?? ownerProfile?.email ?? "",
    donorAddress: [detail?.billingAddressLine1, detail?.billingAddressLine2, cityLine].filter(
      (line): line is string => Boolean(line && line.trim()),
    ),
    amount: usd(total),
    taxYear,
    giftType: giftTypeLabel(donation.donationType),
    isTaxCredit: donation.donationType === "tax_credit",
    designation: donation.campaign?.title ?? metaTitle ?? "ACT general scholarship fund",
    paymentReference: donation.paymentProviderCaptureId ?? donation.paymentProviderOrderId ?? "",
    isVoid: receipt.status === "void",
    breakdown,
  };

  const buffer = await streamToBuffer(await pdf(TaxReceiptDocument({ data, logo: await receiptLogo() })).toBuffer());
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${receipt.receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
