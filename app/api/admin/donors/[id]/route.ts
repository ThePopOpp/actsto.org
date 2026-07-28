import { NextResponse } from "next/server";

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
    await prisma.donation.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}
