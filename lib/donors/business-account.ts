import "server-only";

import type { ActSession } from "@/lib/auth/types";
import { getMyGiving, type MyGift } from "@/lib/donors/my-giving";
import { prisma } from "@/lib/prisma";

export type BusinessCompany = {
  businessName: string;
  ein: string;
  businessEmail: string;
  businessPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  logoUrl: string;
};

export type BusinessPledge = {
  id: string;
  campaignTitle: string;
  committed: number;
  /** Paid gifts recorded against this pledge. */
  received: number;
  status: string;
  createdAt: string;
};

export type BusinessInvoice = {
  id: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  total: number;
  status: string;
};

export type BusinessAccount = {
  profileId: string | null;
  company: BusinessCompany;
  /** Fields a receipt or ADOR filing needs that are still blank. */
  missingCompanyFields: string[];
  gifts: MyGift[];
  pledges: BusinessPledge[];
  invoices: BusinessInvoice[];
  totalThisTaxYear: number;
  totalAllTime: number;
  /** Paid gifts by tax year, newest first. */
  byTaxYear: { taxYear: number; total: number; count: number; receipts: number }[];
};

const EMPTY_COMPANY: BusinessCompany = {
  businessName: "",
  ein: "",
  businessEmail: "",
  businessPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "AZ",
  zip: "",
  logoUrl: "",
};

/**
 * Everything the business dashboard shows, read from the signed-in account's
 * own records. These pages used to render invented pledges, invoices, tax
 * filings and employees to every business donor; a company reading its own
 * corporate tax-credit totals needs them to be its own.
 */
export async function getBusinessAccount(session: ActSession): Promise<BusinessAccount> {
  const profile = await prisma.profile
    .findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: { id: true, businessDonorProfile: true },
    })
    .catch(() => null);

  const business = profile?.businessDonorProfile ?? null;
  const company: BusinessCompany = business
    ? {
        businessName: business.businessName ?? "",
        ein: business.ein ?? "",
        businessEmail: business.businessEmail ?? "",
        businessPhone: business.businessPhone ?? "",
        addressLine1: business.addressLine1 ?? "",
        addressLine2: business.addressLine2 ?? "",
        city: business.city ?? "",
        state: business.state ?? "AZ",
        zip: business.zip ?? "",
        logoUrl: business.logoUrl ?? "",
      }
    : EMPTY_COMPANY;

  const missingCompanyFields = [
    ["Legal business name", company.businessName],
    ["EIN", company.ein],
    ["Business address", company.addressLine1 && company.city && company.zip],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label as string);

  const [giving, pledgeRows, invoiceRows] = await Promise.all([
    getMyGiving(session),
    profile
      ? prisma.pledge
          .findMany({
            where: { userId: profile.id, status: { not: "cancelled" } },
            orderBy: { createdAt: "desc" },
            include: { donations: { where: { status: "paid" }, select: { amount: true, totalAmount: true } } },
          })
          .catch(() => [])
      : Promise.resolve([]),
    profile
      ? prisma.invoice
          .findMany({
            // Drafts are staff work in progress, not something the company was sent.
            where: { pledge: { userId: profile.id }, status: { not: "draft" } },
            orderBy: { issuedDate: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const campaignIds = Array.from(new Set(pledgeRows.map((p) => p.campaignId)));
  const titles = new Map(
    campaignIds.length
      ? (
          await prisma.campaign
            .findMany({ where: { id: { in: campaignIds } }, select: { id: true, title: true } })
            .catch(() => [])
        ).map((c) => [c.id, c.title])
      : [],
  );

  const pledges: BusinessPledge[] = pledgeRows.map((pledge) => ({
    id: pledge.id,
    campaignTitle: titles.get(pledge.campaignId) ?? "General pledge",
    committed: Number(pledge.amount),
    received: pledge.donations.reduce((sum, d) => sum + Number(d.totalAmount ?? d.amount ?? 0), 0),
    status: pledge.status,
    createdAt: pledge.createdAt.toISOString().slice(0, 10),
  }));

  const invoices: BusinessInvoice[] = invoiceRows.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    total: Number(invoice.total),
    status: invoice.status,
  }));

  const years = new Map<number, { total: number; count: number; receipts: number }>();
  for (const gift of giving.gifts) {
    const year = gift.taxYear ?? Number(gift.date.slice(0, 4));
    const row = years.get(year) ?? { total: 0, count: 0, receipts: 0 };
    row.total += gift.amount;
    row.count += 1;
    if (gift.receiptNumber) row.receipts += 1;
    years.set(year, row);
  }

  return {
    profileId: profile?.id ?? null,
    company,
    missingCompanyFields,
    gifts: giving.gifts,
    pledges,
    invoices,
    totalThisTaxYear: giving.totalThisTaxYear,
    totalAllTime: giving.gifts.reduce((sum, gift) => sum + gift.amount, 0),
    byTaxYear: Array.from(years.entries())
      .map(([taxYear, row]) => ({ taxYear, ...row }))
      .sort((a, b) => b.taxYear - a.taxYear),
  };
}

/** A business account with no records yet — what a brand-new company sees. */
export function emptyBusinessAccount(): BusinessAccount {
  return {
    profileId: null,
    company: EMPTY_COMPANY,
    missingCompanyFields: ["Legal business name", "EIN", "Business address"],
    gifts: [],
    pledges: [],
    invoices: [],
    totalThisTaxYear: 0,
    totalAllTime: 0,
    byTaxYear: [],
  };
}

/** The business profile id that owns this invoice, for the PDF route's check. */
export async function invoiceOwnerId(invoiceId: string): Promise<string | null> {
  const invoice = await prisma.invoice
    .findUnique({ where: { id: invoiceId }, select: { status: true, pledge: { select: { userId: true } } } })
    .catch(() => null);
  if (!invoice || invoice.status === "draft") return null;
  return invoice.pledge.userId;
}
