import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { logPaypalPaymentEvent } from "@/lib/paypal/payment-records";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/expire-pending — { olderThanHours?: number }
 *
 * Marks abandoned checkouts (pending, never captured, older than the cut-off)
 * as cancelled, so the Payments table and the pending count mean something.
 * A late capture still lands: finalizing a payment sets it to paid whatever
 * its status was.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { olderThanHours?: number } | null;
  const hours = Math.max(24, Number(body?.olderThanHours ?? 72) || 72);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stale = await prisma.donation.findMany({
    where: { status: "pending", paymentProviderCaptureId: null, createdAt: { lt: cutoff } },
    select: { id: true, paymentProviderOrderId: true },
  });
  if (stale.length === 0) return NextResponse.json({ expired: 0 });

  await prisma.donation.updateMany({
    where: { id: { in: stale.map((d) => d.id) }, status: "pending" },
    data: { status: "cancelled" },
  });
  for (const d of stale) {
    await logPaypalPaymentEvent({
      donationId: d.id,
      orderId: d.paymentProviderOrderId,
      captureId: null,
      eventType: "CHECKOUT.ORDER.EXPIRED_BY_ADMIN",
      payload: { olderThanHours: hours, by: auth.actor.email },
      processed: true,
    }).catch(() => undefined);
  }
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "donations.expire_pending",
    entityType: "donation",
    after: { count: stale.length, olderThanHours: hours },
  });
  return NextResponse.json({ expired: stale.length });
}
