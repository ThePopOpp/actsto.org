import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { ensureTaxReceiptForDonation } from "@/lib/paypal/payment-records";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["paid", "pending", "failed", "cancelled", "refunded"];

/** Mark a donation status (manual reconciliation) or generate its receipt. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string; generateReceipt?: boolean } | null;

  if (body?.generateReceipt) {
    const d = await prisma.donation.findUnique({ where: { id }, select: { id: true, totalAmount: true, amount: true } });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await ensureTaxReceiptForDonation(d.id, String(d.totalAmount ?? d.amount)).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  if (body?.status && ALLOWED_STATUS.includes(body.status)) {
    const before = await prisma.donation.findUnique({ where: { id }, select: { status: true, offlinePayment: { select: { id: true } } } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // A recorded check is returned or voided on Payments, which also voids the
    // receipt, takes it off the campaign and protects awarded money.
    if (before.offlinePayment) {
      return NextResponse.json({ error: "Use Mark returned or void on Payments for a recorded check." }, { status: 409 });
    }
    await prisma.donation.update({ where: { id }, data: { status: body.status } });
    await logAdminActivity({
      actorEmail: auth.email,
      action: "donation.status_change",
      entityType: "donation",
      entityId: id,
      before: { status: before.status },
      after: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}
