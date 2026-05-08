import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { capturePaypalOrder } from "@/lib/paypal/client";

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

  // Fetch existing donation — guard against double-capture
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
    // Idempotent — already captured
    return NextResponse.json({ ok: true, donationId, alreadyCaptured: true });
  }

  if (donation.paymentProviderOrderId && donation.paymentProviderOrderId !== orderId) {
    return NextResponse.json({ error: "Order ID mismatch." }, { status: 400 });
  }

  try {
    const { captureId, status, amountUsd } = await capturePaypalOrder(orderId);

    if (status !== "COMPLETED") {
      await prisma.donation.update({
        where: { id: donationId },
        data: { status: "failed" },
      });
      await logPaymentEvent({ donationId, orderId, captureId: null, eventType: "PAYMENT.CAPTURE.DENIED", payload: { status } });
      return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
    }

    const paidUpdate = await prisma.donation.updateMany({
      where: { id: donationId, status: { not: "paid" } },
      data: {
        status: "paid",
        paymentProviderOrderId: orderId,
        paymentProviderCaptureId: captureId,
        totalAmount: amountUsd,
      },
    });

    if (paidUpdate.count > 0 && donation.campaignId) {
      await prisma.$transaction([
        prisma.campaign.update({
          where: { id: donation.campaignId },
          data: {
            raisedAmount: { increment: amountUsd },
            donorCount: { increment: 1 },
          },
        }),
        prisma.donationAllocation.create({
          data: {
            donationId,
            campaignId: donation.campaignId,
            amount: amountUsd,
            allocationType: "campaign",
          },
        }),
        prisma.campaignBacker.create({
          data: {
            campaignId: donation.campaignId,
            donationId,
            userId: donation.userId,
            amount: amountUsd,
            message: donation.donorMessage,
            isAnonymous: donation.anonymous,
            showAmount: false,
            showMessage: Boolean(donation.donorMessage),
            status: "visible",
          },
        }),
      ]);
    }

    await logPaymentEvent({
      donationId,
      orderId,
      captureId,
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      payload: { status, amountUsd },
    });

    return NextResponse.json({ ok: true, donationId, captureId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to capture payment.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function logPaymentEvent(opts: {
  donationId: string;
  orderId: string;
  captureId: string | null;
  eventType: string;
  payload: object;
}) {
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "paypal",
        eventType: opts.eventType,
        providerOrderId: opts.orderId,
        providerCaptureId: opts.captureId,
        donationId: opts.donationId,
        payload: opts.payload,
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch {
    // Non-fatal — donation is already updated
  }
}
