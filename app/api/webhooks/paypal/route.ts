import { NextResponse } from "next/server";

import { getPaypalSettingsForServer } from "@/lib/admin/integration-settings-server";
import { prisma } from "@/lib/prisma";
import { verifyPaypalWebhook } from "@/lib/paypal/client";
import {
  finalizePaidDonation,
  logPaypalPaymentEvent,
  markDonationPaymentStatus,
} from "@/lib/paypal/payment-records";

/**
 * POST /api/webhooks/paypal
 *
 * Receives PayPal webhook events, verifies the signature, logs the raw event,
 * and updates Donation/receipt state for known payment events.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";
  const certUrl = req.headers.get("paypal-cert-url") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";
  const authAlgo = req.headers.get("paypal-auth-algo") ?? "";

  let verified = false;
  try {
    const settings = await getPaypalSettingsForServer();
    if (settings.webhookId) {
      verified = await verifyPaypalWebhook({
        webhookId: settings.webhookId,
        transmissionId,
        transmissionTime,
        certUrl,
        transmissionSig,
        authAlgo,
        body: rawBody,
      });
    }
  } catch {
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 401 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: {
    id?: string;
    event_type?: string;
    resource?: {
      id?: string;
      order_id?: string;
      amount?: { value?: string };
      status?: string;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = event.id ?? null;
  const eventType = event.event_type ?? "";
  const captureId = event.resource?.id ?? null;
  const orderId = event.resource?.order_id ?? null;

  if (eventId) {
    const existing = await prisma.paymentEvent.findUnique({
      where: { providerEventId: eventId },
    });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
  }

  let donationId: string | null = null;
  if (orderId) {
    const donation = await prisma.donation
      .findFirst({
        where: { paymentProviderOrderId: orderId },
        select: { id: true },
      })
      .catch(() => null);
    donationId = donation?.id ?? null;
  }
  if (!donationId && captureId) {
    const donation = await prisma.donation
      .findFirst({
        where: { paymentProviderCaptureId: captureId },
        select: { id: true },
      })
      .catch(() => null);
    donationId = donation?.id ?? null;
  }

  await logPaypalPaymentEvent({
    donationId,
    orderId,
    captureId,
    eventType,
    providerEventId: eventId,
    payload: event as object,
    processed: false,
  });

  if (!donationId) {
    return NextResponse.json({ ok: true, matchedDonation: false });
  }

  try {
    if (eventType === "PAYMENT.CAPTURE.COMPLETED" && event.resource?.amount?.value) {
      await finalizePaidDonation({
        donationId,
        orderId: orderId ?? "",
        captureId,
        amountUsd: event.resource.amount.value,
        eventType,
        payload: event as object,
      });
    } else if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "CHECKOUT.PAYMENT-APPROVAL.REVERSED"
    ) {
      await markDonationPaymentStatus({
        donationId,
        orderId,
        captureId,
        status: "failed",
        eventType,
        payload: event as object,
      });
    } else if (
      eventType === "PAYMENT.CAPTURE.REVERSED" ||
      eventType === "PAYMENT.CAPTURE.REFUNDED"
    ) {
      await markDonationPaymentStatus({
        donationId,
        orderId,
        captureId,
        status: "refunded",
        eventType,
        payload: event as object,
      });
    }

    if (eventId) {
      await prisma.paymentEvent.updateMany({
        where: { providerEventId: eventId },
        data: { processed: true, processedAt: new Date() },
      });
    }
  } catch {
    // Return 200 after logging so PayPal does not retry forever for local DB processing errors.
  }

  return NextResponse.json({ ok: true });
}
