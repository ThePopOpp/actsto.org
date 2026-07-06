import { NextResponse } from "next/server";

import { invoiceToPdfFormData, markInvoicePaid } from "@/lib/admin/invoices";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { pledge: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const billing = await invoiceToPdfFormData(invoice);
  return NextResponse.json({ invoice, billing });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    action?: "mark_paid" | "void" | "sent";
    donationId?: string;
  } | null;

  try {
    if (body?.action === "mark_paid") {
      const invoice = await markInvoicePaid(id, body.donationId);
      return NextResponse.json({ invoice });
    }
    if (body?.action === "void" || body?.action === "sent") {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: { status: body.action === "void" ? "void" : "sent" },
      });
      return NextResponse.json({ invoice });
    }
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update invoice." },
      { status: 400 }
    );
  }
}
