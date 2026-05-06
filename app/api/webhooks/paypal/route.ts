import { NextResponse } from "next/server";

import { getPaypalSettingsForServer } from "@/lib/admin/integration-settings-server";
import { prisma } from "@/lib/prisma";
import { verifyPaypalWebhook } from "@/lib/paypal/client";

/**
 * POST /api/webhooks/paypal
 *
 * Receives PayPal webhook events, verifies the signature, and updates Donation status.
 * Idempotent — deduplicates on providerEventId.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";
  const certUrl = req.headers.get("paypal-cert-url") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";
  const authAlgo = req.headers.get("paypal-auth-algo") ?? "";

  // Verify webhook signature using stored webhookId
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
    // Verification error — reject
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

  // Idempotency check
  if (eventId) {
    const existing = await prisma.paymentEvent.findUnique({
      where: { providerEventId: eventId },
    });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
  }

  // Find donation by PayPal order ID
  let donationId: string | null = null;
  if (orderId) {
    try {
      const donation = await prisma.donation.findFirst({
        where: { paymentProviderOrderId: orderId },
        select: { id: true },
      });
      donationId = donation?.id ?? null;
    } catch {
      // Non-fatal — log anyway
    }
  }

  // Log the raw event
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "paypal",
        eventType,
        providerEventId: eventId,
        providerOrderId: orderId,
        providerCaptureId: captureId,
        donationId,
        payload: event as object,
        processed: false,
      },
    });
  } catch {
    // Already logged or DB error — continue processing
  }

  // Process known event types
  if (donationId) {
    try {
      if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        await prisma.donation.updateMany({
          where: { id: donationId, status: { not: "paid" } },
          data: {
            status: "paid",
            paymentProviderCaptureId: captureId,
            totalAmount: event.resource?.amount?.value ?? undefined,
          },
        });
        await prisma.paymentEvent.updateMany({
          where: { providerEventId: eventId ?? "" },
          data: { processed: true, processedAt: new Date() },
        });
      } else if (
        eventType === "PAYMENT.CAPTURE.DENIED" ||
        eventType === "PAYMENT.CAPTURE.REVERSED"
      ) {
        const newStatus = eventType === "PAYMENT.CAPTURE.REVERSED" ? "refunded" : "failed";
        await prisma.donation.updateMany({
          where: { id: donationId, status: { not: newStatus } },
          data: { status: newStatus },
        });
        await prisma.paymentEvent.updateMany({
          where: { providerEventId: eventId ?? "" },
          data: { processed: true, processedAt: new Date() },
        });
      }
    } catch {
      // DB error processing — return 200 so PayPal doesn't retry forever
    }
  }

  return NextResponse.json({ ok: true });
}
