import { NextResponse } from "next/server";

import { createInvoice, listInvoices, type CreateInvoiceInput } from "@/lib/admin/invoices";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const invoices = await listInvoices();
  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate,
      total: Number(inv.total),
      campaignTitle: inv.campaignTitle,
      pledgeId: inv.pledgeId,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    pledgeId?: string;
    dueDate?: string;
    lineItems?: { description: string; quantity: number; unitPrice: number }[];
    taxRatePercent?: number;
    notes?: string;
  } | null;

  if (!body?.pledgeId || !body.dueDate || !body.lineItems?.length) {
    return NextResponse.json({ error: "pledgeId, dueDate, and at least one line item are required." }, { status: 400 });
  }

  const input: CreateInvoiceInput = {
    pledgeId: body.pledgeId,
    dueDate: body.dueDate,
    lineItems: body.lineItems,
    taxRatePercent: Number(body.taxRatePercent) || 0,
    notes: body.notes,
    createdByEmail: auth.email,
  };

  try {
    const invoice = await createInvoice(input);
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create invoice." },
      { status: 400 }
    );
  }
}
