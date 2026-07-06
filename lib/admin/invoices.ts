import "server-only";

import { prisma } from "@/lib/prisma";
import type { InvoiceFormData, InvoiceLine } from "@/lib/admin/invoice-types";

export type InvoiceLineItem = InvoiceLine;

/** @react-pdf/renderer's Node `.toBuffer()` resolves a ReadableStream, not a Buffer. */
export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "binary"));
  }
  return Buffer.concat(chunks);
}

export function computeInvoiceTotals(lines: InvoiceLineItem[], taxRatePercent: number) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const taxAmount = subtotal * (taxRatePercent / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

/** Retries a few times on the unique constraint in case of a same-instant collision. */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `INV-${year}-${suffix}`;
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!existing) return candidate;
  }
  return `INV-${year}-${Date.now()}`;
}

/** Pledge → Campaign is a bare FK column (no Prisma relation), so titles are batch-looked-up. */
async function campaignTitlesByIds(campaignIds: string[]): Promise<Map<string, string>> {
  if (!campaignIds.length) return new Map();
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: Array.from(new Set(campaignIds)) } },
    select: { id: true, title: true },
  });
  return new Map(campaigns.map((c) => [c.id, c.title]));
}

/** Pledges eligible for invoicing — belong to a user with a BusinessDonorProfile, not yet fulfilled. */
export async function listInvoiceablePledges() {
  const businessProfiles = await prisma.businessDonorProfile.findMany({
    select: { userId: true, businessName: true, businessEmail: true },
  });
  const byUserId = new Map(businessProfiles.map((p) => [p.userId, p]));
  if (byUserId.size === 0) return [];

  const pledges = await prisma.pledge.findMany({
    where: { userId: { in: Array.from(byUserId.keys()) }, status: { in: ["pending", "confirmed"] } },
    orderBy: { createdAt: "desc" },
  });
  const titles = await campaignTitlesByIds(pledges.map((p) => p.campaignId));

  return pledges.map((pledge) => ({
    id: pledge.id,
    amount: Number(pledge.amount),
    status: pledge.status,
    campaignTitle: titles.get(pledge.campaignId) ?? "General pledge",
    businessName: byUserId.get(pledge.userId)?.businessName ?? "Unnamed business",
    businessEmail: byUserId.get(pledge.userId)?.businessEmail ?? null,
    createdAt: pledge.createdAt,
  }));
}

export async function getBusinessBillingInfo(pledgeUserId: string) {
  const [businessProfile, profile] = await Promise.all([
    prisma.businessDonorProfile.findUnique({ where: { userId: pledgeUserId } }),
    prisma.profile.findUnique({ where: { id: pledgeUserId } }),
  ]);
  const addressLines = [
    businessProfile?.addressLine1,
    businessProfile?.addressLine2,
    [businessProfile?.city, businessProfile?.state, businessProfile?.zip].filter(Boolean).join(", "),
  ].filter(Boolean);

  return {
    name: businessProfile?.businessName ?? profile?.fullName ?? "Unnamed business",
    email: businessProfile?.businessEmail ?? profile?.email ?? "",
    address: addressLines.join("\n"),
  };
}

export async function listInvoices() {
  const invoices = await prisma.invoice.findMany({
    include: { pledge: true },
    orderBy: { createdAt: "desc" },
  });
  const titles = await campaignTitlesByIds(invoices.map((inv) => inv.pledge.campaignId));
  return invoices.map((inv) => ({
    ...inv,
    campaignTitle: titles.get(inv.pledge.campaignId) ?? "General pledge",
  }));
}

export type CreateInvoiceInput = {
  pledgeId: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  taxRatePercent: number;
  notes?: string;
  createdByEmail: string;
};

export async function createInvoice(input: CreateInvoiceInput) {
  const pledge = await prisma.pledge.findUnique({ where: { id: input.pledgeId } });
  if (!pledge) throw new Error("Pledge not found.");

  const businessProfile = await prisma.businessDonorProfile.findUnique({
    where: { userId: pledge.userId },
  });
  if (!businessProfile) {
    throw new Error("This pledge does not belong to a business donor — invoices are for business donor pledges only.");
  }
  if (!input.lineItems.length) throw new Error("At least one line item is required.");

  const { subtotal, taxAmount, total } = computeInvoiceTotals(input.lineItems, input.taxRatePercent);
  const invoiceNumber = await generateInvoiceNumber();

  return prisma.invoice.create({
    data: {
      pledgeId: input.pledgeId,
      invoiceNumber,
      issuedDate: new Date(),
      dueDate: new Date(input.dueDate),
      status: "draft",
      lineItems: input.lineItems,
      subtotal,
      taxRatePercent: input.taxRatePercent,
      taxAmount,
      total,
      notes: input.notes,
      createdByEmail: input.createdByEmail,
    },
  });
}

export async function markInvoicePaid(invoiceId: string, donationId?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found.");
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date(), donationId: donationId ?? invoice.donationId },
  });
}

type InvoiceWithPledge = {
  invoiceNumber: string;
  issuedDate: Date;
  dueDate: Date;
  lineItems: unknown;
  taxRatePercent: unknown;
  notes: string | null;
  pledge: { userId: string };
};

export async function invoiceToPdfFormData(invoice: InvoiceWithPledge): Promise<InvoiceFormData> {
  const billing = await getBusinessBillingInfo(invoice.pledge.userId);
  return {
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    billToName: billing.name,
    billToEmail: billing.email,
    billToAddress: billing.address,
    lines: invoice.lineItems as unknown as InvoiceLine[],
    taxRatePercent: Number(invoice.taxRatePercent),
    notes: invoice.notes ?? "",
  };
}
