import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { capturePaypalOrder } from "@/lib/paypal/client";
import {
  finalizePaidDonation,
  markDonationPaymentStatus,
} from "@/lib/paypal/payment-records";

/**
 * POST /api/paypal/capture-order
 *
 * Called after the donor approves payment in the PayPal UI.
 * Captures the PayPal order server-side and marks the Donation as paid.
 *
 * Body: { orderId: string, donationId: string }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    donationId?: string;
  } | null;

  const orderId = body?.orderId?.trim() ?? "";
  const donationId = body?.donationId?.trim() ?? "";

  if (!orderId || !donationId) {
    return NextResponse.json({ error: "orderId and donationId are required." }, { status: 400 });
  }

  let donation;
  try {
    donation = await prisma.donation.findUnique({ where: { id: donationId } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!donation) {
    return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  }

  if (donation.status === "paid") {
    return NextResponse.json({ ok: true, donationId, alreadyCaptured: true });
  }

  if (donation.paymentProviderOrderId && donation.paymentProviderOrderId !== orderId) {
    return NextResponse.json({ error: "Order ID mismatch." }, { status: 400 });
  }

  try {
    const { captureId, status, amountUsd } = await capturePaypalOrder(orderId);

    if (status !== "COMPLETED") {
      await markDonationPaymentStatus({
        donationId,
        orderId,
        captureId: null,
        status: "failed",
        eventType: "PAYMENT.CAPTURE.DENIED",
        payload: { status },
      });
      return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
    }

    const { receipt } = await finalizePaidDonation({
      donationId,
      orderId,
      captureId,
      amountUsd,
      payload: { status, amountUsd },
    });

    return NextResponse.json({
      ok: true,
      donationId,
      captureId,
      receiptNumber: receipt.receiptNumber,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to capture payment.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
