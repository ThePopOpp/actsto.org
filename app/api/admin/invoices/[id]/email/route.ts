import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import { invoiceToPdfFormData, streamToBuffer } from "@/lib/admin/invoices";
import { InvoicePdfDocument } from "@/components/dashboard/admin/invoice-pdf-document";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { pledge: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const data = await invoiceToPdfFormData(invoice);
  if (!data.billToEmail) {
    return NextResponse.json({ error: "This business donor has no email on file." }, { status: 400 });
  }

  const buffer = await streamToBuffer(await pdf(InvoicePdfDocument({ data })).toBuffer());

  await sendSmtpEmail({
    to: data.billToEmail,
    subject: `Invoice ${invoice.invoiceNumber} — Arizona Christian Tuition`,
    text: `Hi ${data.billToName},\n\nAttached is invoice ${invoice.invoiceNumber} for $${Number(invoice.total).toFixed(2)}, due ${data.dueDate}.\n\nThank you for supporting Arizona families.`,
    templateKey: "invoice",
    attachments: [{ filename: `invoice-${invoice.invoiceNumber}.pdf`, content: buffer, contentType: "application/pdf" }],
  });

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: invoice.status === "draft" ? "sent" : invoice.status },
  });

  return NextResponse.json({ invoice: updated });
}
