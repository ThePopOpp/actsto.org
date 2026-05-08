import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { markDonationPaymentStatus } from "@/lib/paypal/payment-records";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    donationId?: string;
    orderId?: string;
  } | null;

  const donationId = body?.donationId?.trim() ?? "";
  const orderId = body?.orderId?.trim() || null;

  if (!donationId) {
    return NextResponse.json({ error: "donationId is required." }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({ where: { id: donationId } }).catch(() => null);
  if (!donation) {
    return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  }

  if (donation.status === "paid") {
    return NextResponse.json({ ok: true, donationId, alreadyCaptured: true });
  }

  await markDonationPaymentStatus({
    donationId,
    orderId: orderId ?? donation.paymentProviderOrderId,
    captureId: donation.paymentProviderCaptureId,
    status: "cancelled",
    eventType: "CHECKOUT.ORDER.CANCELLED",
    payload: { source: "paypal_buttons_on_cancel" },
  });

  return NextResponse.json({ ok: true, donationId });
}
