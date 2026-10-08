import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import { InvoicePdfDocument } from "@/components/dashboard/admin/invoice-pdf-document";
import { invoiceToPdfFormData, streamToBuffer } from "@/lib/admin/invoices";
import { getActSession } from "@/lib/auth/session-server";
import { invoiceOwnerId } from "@/lib/donors/business-account";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/business/invoices/:id/pdf
 *
 * A business donor's own invoice. Only the company the pledge belongs to may
 * open it, and never a draft; anything else is a 404 so the id leaks nothing.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const [ownerId, profile] = await Promise.all([
    invoiceOwnerId(id),
    prisma.profile.findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  if (!ownerId || !profile || ownerId !== profile.id) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { pledge: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const data = await invoiceToPdfFormData(invoice);
  const buffer = await streamToBuffer(await pdf(InvoicePdfDocument({ data })).toBuffer());

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
