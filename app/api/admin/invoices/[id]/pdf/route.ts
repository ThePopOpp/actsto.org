import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import { invoiceToPdfFormData, streamToBuffer } from "@/lib/admin/invoices";
import { InvoicePdfDocument } from "@/components/dashboard/admin/invoice-pdf-document";
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

  const data = await invoiceToPdfFormData(invoice);
  const buffer = await streamToBuffer(await pdf(InvoicePdfDocument({ data })).toBuffer());

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
