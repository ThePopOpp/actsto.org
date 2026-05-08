import { prisma } from "@/lib/prisma";

export async function finalizePaidDonation({
  donationId,
  orderId,
  captureId,
  amountUsd,
  eventType = "PAYMENT.CAPTURE.COMPLETED",
  payload = {},
}: {
  donationId: string;
  orderId: string;
  captureId: string | null;
  amountUsd: string;
  eventType?: string;
  payload?: object;
}) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donation not found.");

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

  const receipt = await ensureTaxReceiptForDonation(donationId, amountUsd);
  await logPaypalPaymentEvent({
    donationId,
    orderId,
    captureId,
    eventType,
    payload,
    processed: true,
  });

  return { receipt, newlyPaid: paidUpdate.count > 0 };
}

export async function ensureTaxReceiptForDonation(donationId: string, amountUsd?: string) {
  const existing = await prisma.taxReceipt.findFirst({ where: { donationId } });
  if (existing) return existing;

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { donationDetail: true },
  });
  if (!donation) throw new Error("Donation not found.");

  const taxYear = donation.taxYear ?? donation.createdAt.getFullYear();
  const receiptNumber = `ACT-${taxYear}-${donation.id.slice(0, 8).toUpperCase()}`;
  const issuedToName = donation.donationDetail
    ? [donation.donationDetail.donorFirstName, donation.donationDetail.donorLastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null
    : null;

  return prisma.taxReceipt.create({
    data: {
      donationId,
      receiptNumber,
      taxYear,
      issuedToName,
      issuedToEmail: donation.donationDetail?.donorEmail ?? null,
      amount: amountUsd ?? donation.totalAmount ?? donation.amount,
      issuedAt: new Date(),
      status: "generated",
    },
  });
}

export async function markDonationPaymentStatus({
  donationId,
  orderId,
  captureId,
  status,
  eventType,
  payload = {},
}: {
  donationId: string;
  orderId: string | null;
  captureId: string | null;
  status: "cancelled" | "failed" | "refunded" | "partially_refunded";
  eventType: string;
  payload?: object;
}) {
  await prisma.donation.updateMany({
    where: { id: donationId, status: { not: status } },
    data: { status },
  });
  await logPaypalPaymentEvent({
    donationId,
    orderId,
    captureId,
    eventType,
    payload: { status, ...payload },
    processed: true,
  });
}

export async function logPaypalPaymentEvent({
  donationId,
  orderId,
  captureId,
  eventType,
  payload,
  providerEventId = null,
  processed = true,
}: {
  donationId: string | null;
  orderId: string | null;
  captureId: string | null;
  eventType: string;
  payload: object;
  providerEventId?: string | null;
  processed?: boolean;
}) {
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "paypal",
        eventType,
        providerEventId,
        providerOrderId: orderId,
        providerCaptureId: captureId,
        donationId,
        payload,
        processed,
        processedAt: processed ? new Date() : null,
      },
    });
  } catch {
    // Non-fatal: payment state should not fail just because an event row already exists.
  }
}
