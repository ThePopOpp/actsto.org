import { fireAutomationEvent } from "@/lib/automations/fire";
import { prisma } from "@/lib/prisma";

function siteBase() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://actsto.org").replace(/\/$/, "");
}
function usd(v: unknown) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

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
  const backerDisplay = await getBackerDisplayForDonation(donationId);

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
          displayName: backerDisplay.displayName,
          avatarUrl: backerDisplay.avatarUrl,
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

  if (paidUpdate.count > 0) {
    try {
      const detail = await prisma.donationDetail.findUnique({ where: { donationId } }).catch(() => null);
      const campaign = donation.campaignId
        ? await prisma.campaign.findUnique({ where: { id: donation.campaignId }, select: { title: true, slug: true } }).catch(() => null)
        : null;
      const site = siteBase();
      const email = receipt.issuedToEmail ?? detail?.donorEmail ?? null;
      const firstName = detail?.donorFirstName ?? receipt.issuedToName?.split(" ")[0] ?? "";
      await fireAutomationEvent("donation_paid", {
        userId: donation.userId,
        email,
        phone: detail?.donorPhone ?? null,
        campaignId: donation.campaignId,
        amount: Number(amountUsd),
        fields: {
          first_name: firstName,
          last_name: detail?.donorLastName ?? "",
          full_name: receipt.issuedToName ?? "",
          email: email ?? "",
          phone: detail?.donorPhone ?? "",
          donation_amount: usd(amountUsd),
          campaign_title: campaign?.title ?? "General fund",
          campaign_url: campaign?.slug ? `${site}/campaigns/${campaign.slug}` : site,
          receipt_number: receipt.receiptNumber,
          tax_year: String(receipt.taxYear),
        },
      });
    } catch {
      /* automations must not block payment finalization */
    }
  }

  return { receipt, newlyPaid: paidUpdate.count > 0 };
}

async function getBackerDisplayForDonation(donationId: string) {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { donationDetail: true },
  });
  if (!donation) return { displayName: "Supporter", avatarUrl: null as string | null };
  if (donation.anonymous) return { displayName: "Anonymous", avatarUrl: null as string | null };

  const detailName = donation.donationDetail
    ? [donation.donationDetail.donorFirstName, donation.donationDetail.donorLastName]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";
  if (detailName) return { displayName: detailName, avatarUrl: null as string | null };

  if (donation.userId) {
    const profile = await prisma.profile.findUnique({
      where: { id: donation.userId },
      select: { displayName: true, fullName: true, email: true, avatarUrl: true },
    }).catch(() => null);
    if (profile) {
      return {
        displayName: profile.displayName || profile.fullName || profile.email.split("@")[0] || "Supporter",
        avatarUrl: profile.avatarUrl,
      };
    }
  }

  if (donation.donationDetail?.donorEmail) {
    return { displayName: donation.donationDetail.donorEmail, avatarUrl: null as string | null };
  }

  return { displayName: "Supporter", avatarUrl: null as string | null };
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

  const created = await prisma.taxReceipt.create({
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

  try {
    const campaign = donation.campaignId
      ? await prisma.campaign.findUnique({ where: { id: donation.campaignId }, select: { title: true } }).catch(() => null)
      : null;
    await fireAutomationEvent("tax_receipt_generated", {
      userId: donation.userId,
      email: created.issuedToEmail,
      phone: donation.donationDetail?.donorPhone ?? null,
      campaignId: donation.campaignId,
      amount: Number(created.amount),
      fields: {
        first_name: donation.donationDetail?.donorFirstName ?? created.issuedToName?.split(" ")[0] ?? "",
        full_name: created.issuedToName ?? "",
        email: created.issuedToEmail ?? "",
        donation_amount: usd(created.amount),
        receipt_number: created.receiptNumber,
        tax_year: String(created.taxYear),
        campaign_title: campaign?.title ?? "General fund",
      },
    });
  } catch {
    /* non-blocking */
  }

  return created;
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
