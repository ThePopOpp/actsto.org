import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { sendDonationReceiptEmail } from "@/lib/email/donation-receipt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/receipts/:id/email — email a generated receipt that hasn't
 * been sent (for example a check recorded without "Email receipt now").
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const receipt = await prisma.taxReceipt.findUnique({
    where: { id },
    select: { id: true, donationId: true, status: true, emailedAt: true, receiptNumber: true, issuedToEmail: true, donation: { select: { donationDetail: { select: { donorEmail: true } } } } },
  });
  if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  if (receipt.status === "void") return NextResponse.json({ error: "This receipt is void." }, { status: 409 });
  if (receipt.emailedAt) return NextResponse.json({ error: "This receipt was already emailed." }, { status: 409 });
  if (!receipt.issuedToEmail && !receipt.donation.donationDetail?.donorEmail) {
    return NextResponse.json({ error: "There's no email address for this donor. Download and mail the PDF." }, { status: 400 });
  }
  const sent = await sendDonationReceiptEmail(receipt.donationId);
  if (!sent) return NextResponse.json({ error: "The email didn't send. Check email settings and try again." }, { status: 502 });
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "receipt.email",
    entityType: "tax_receipt",
    entityId: receipt.id,
    after: { receiptNumber: receipt.receiptNumber },
  });
  return NextResponse.json({ ok: true });
}
