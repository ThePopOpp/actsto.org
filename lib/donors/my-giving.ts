import "server-only";

import type { ActSession } from "@/lib/auth/types";
import type { Campaign } from "@/lib/campaigns";
import { getSiteCampaignsBySlugs } from "@/lib/campaigns-source";
import { prisma } from "@/lib/prisma";

export type MyGift = {
  id: string;
  date: string;
  campaignTitle: string;
  campaignSlug: string | null;
  creditType: string;
  amount: number;
  taxYear: number | null;
  receiptNumber: string | null;
};

export type MyGiving = {
  gifts: MyGift[];
  totalThisTaxYear: number;
  receiptCount: number;
  saved: Campaign[];
};

/** "quick" / "tax_credit" as a label a donor would recognise. */
function creditLabel(donationType: string) {
  switch (donationType) {
    case "tax_credit":
      return "Tax credit";
    case "business":
      return "Business";
    case "general":
      return "General fund";
    case "manual_check":
      return "Check";
    default:
      return "Quick gift";
  }
}

/**
 * The signed-in donor's own paid gifts, receipts and saved campaigns.
 *
 * Every one of these panels used to render a hardcoded sample — three invented
 * gifts totalling $1,750, a fixed "3 receipts ready", and two sample campaigns —
 * to whoever was logged in. A donor reading their own tax-credit total needs it
 * to be their total.
 *
 * Donations are matched by account id and, for gifts made before signing in or
 * as a guest, by the donor email on the donation.
 */
export async function getMyGiving(session: ActSession): Promise<MyGiving> {
  const profile = await prisma.profile
    .findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: { id: true, email: true },
    })
    .catch(() => null);

  const email = (profile?.email ?? session.email).toLowerCase();
  const orClauses = [
    ...(profile ? [{ userId: profile.id }] : []),
    { donationDetail: { donorEmail: { equals: email, mode: "insensitive" as const } } },
  ];

  const donations = await prisma.donation
    .findMany({
      where: {
        status: "paid",
        // Archived pre-launch sandbox tests stay in the table but are not
        // someone's giving history.
        NOT: { metadata: { path: ["isTest"], equals: true } },
        OR: orClauses,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        totalAmount: true,
        donationType: true,
        taxYear: true,
        campaign: { select: { title: true, slug: true } },
        metadata: true,
        taxReceipts: { select: { receiptNumber: true }, take: 1 },
      },
    })
    .catch(() => []);

  const gifts: MyGift[] = donations.map((donation) => {
    const metadata = (donation.metadata ?? {}) as Record<string, unknown>;
    const metaTitle = typeof metadata.campaignTitle === "string" ? metadata.campaignTitle : null;
    const metaSlug = typeof metadata.campaignSlug === "string" ? metadata.campaignSlug : null;
    return {
      id: donation.id,
      date: donation.createdAt.toISOString().slice(0, 10),
      campaignTitle: donation.campaign?.title ?? metaTitle ?? "ACT General Fund",
      campaignSlug: donation.campaign?.slug ?? metaSlug,
      creditType: creditLabel(donation.donationType),
      amount: Number(donation.totalAmount ?? donation.amount ?? 0),
      taxYear: donation.taxYear ?? donation.createdAt.getFullYear(),
      receiptNumber: donation.taxReceipts[0]?.receiptNumber ?? null,
    };
  });

  const currentTaxYear = new Date().getFullYear();
  const totalThisTaxYear = gifts
    .filter((gift) => gift.taxYear === currentTaxYear)
    .reduce((sum, gift) => sum + gift.amount, 0);

  const savedSlugs = profile
    ? await prisma.savedCampaign
        .findMany({
          where: { userId: profile.id },
          orderBy: { createdAt: "desc" },
          select: { campaignSlug: true },
        })
        .then((rows) => rows.map((row) => row.campaignSlug))
        .catch(() => [])
    : [];

  return {
    gifts,
    totalThisTaxYear,
    receiptCount: gifts.filter((gift) => gift.receiptNumber).length,
    saved: savedSlugs.length > 0 ? await getSiteCampaignsBySlugs(savedSlugs) : [],
  };
}
