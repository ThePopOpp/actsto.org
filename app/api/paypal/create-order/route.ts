import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder } from "@/lib/paypal/client";

/**
 * POST /api/paypal/create-order
 *
 * Creates a pending Donation record and a PayPal order.
 * Returns { orderId, donationId } so the frontend can drive the PayPal Buttons flow.
 *
 * Body: {
 *   amount: string (e.g. "250.00"),
 *   donationType?: "quick" | "tax_credit",
 *   campaignId?: string (UUID),
 *   anonymous?: boolean,
 *   donorMessage?: string,
 * }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    amount?: string;
    donationType?: string;
    campaignId?: string;
    anonymous?: boolean;
    donorMessage?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amountRaw = String(body.amount ?? "").replace(/[^0-9.]/g, "");
  const amount = parseFloat(amountRaw);

  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Amount must be at least $1.00." }, { status: 400 });
  }

  const amountUsd = amount.toFixed(2);
  const donationType = body.donationType ?? "quick";
  const campaignId = body.campaignId ?? null;
  const anonymous = body.anonymous ?? false;
  const donorMessage = body.donorMessage?.trim() ?? null;

  // Attach session userId if logged in (optional for anonymous donations)
  const session = await getActSession().catch(() => null);
  const userId = session?.email ? await getUserIdByEmail(session.email) : null;

  try {
    // 1. Create pending Donation row
    const donation = await prisma.donation.create({
      data: {
        userId,
        campaignId,
        amount: amountUsd,
        donationType,
        status: "pending",
        paymentProvider: "paypal",
        anonymous,
        donorMessage,
      },
    });

    // 2. Create PayPal order
    const { orderId } = await createPaypalOrder(amountUsd);

    // 3. Link the PayPal order ID to the donation
    await prisma.donation.update({
      where: { id: donation.id },
      data: { paymentProviderOrderId: orderId },
    });

    return NextResponse.json({ orderId, donationId: donation.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create order.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const profile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return profile?.id ?? null;
  } catch {
    return null;
  }
}
