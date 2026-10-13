import "server-only";

import { Prisma } from "@prisma/client";

import { fundBalances, recomputeCampaignAwarded } from "@/lib/allocation/server";
import { prisma } from "@/lib/prisma";

export class TestRemovalError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "TestRemovalError";
  }
}

/** Donations already archived as pre-launch sandbox tests (metadata.isTest = true). */
export const ARCHIVED_TESTS_ONLY: Prisma.DonationWhereInput = { metadata: { path: ["isTest"], equals: true } };

export function isArchivedTest(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).isTest === true);
}

/**
 * Permanently remove test donations, with everything that hangs off them:
 * receipts, PayPal order and webhook records, fund splits, allocations,
 * backer entries and recommendations.
 *
 * A full copy of each donation and its related rows is written to
 * `removed_test_donations` first, in the same transaction, so a mistake can be
 * traced and restored by hand. The removal is refused for a gift that an award
 * draws on, or whose removal would leave a fund with more awarded than
 * received: those need the award reversed first.
 */
export async function removeTestDonations(
  donationIds: string[],
  actor: { id: string | null; email: string },
  reason: string,
): Promise<{ removed: number; amount: number; campaignIds: string[] }> {
  const ids = Array.from(new Set(donationIds)).filter(Boolean);
  if (ids.length === 0) return { removed: 0, amount: 0, campaignIds: [] };
  const note = reason.trim();
  if (!note) throw new TestRemovalError("Say why these are test donations.", 400);

  const donations = await prisma.donation.findMany({
    where: { id: { in: ids } },
    include: {
      donationDetail: true,
      fundSplits: true,
      donationAllocations: true,
      taxReceipts: true,
      paymentEvents: true,
      campaignBackers: true,
      donorRecommendation: true,
      recommendedStudents: true,
      invoices: { select: { id: true, invoiceNumber: true } },
      awards: { select: { id: true, status: true } },
    },
  });
  if (donations.length !== ids.length) throw new TestRemovalError("Some of these donations no longer exist.", 404);

  const withAwards = donations.filter((d) => d.awards.some((a) => a.status !== "reversed"));
  if (withAwards.length) {
    throw new TestRemovalError(
      `An award draws on ${withAwards.length === 1 ? "this gift" : `${withAwards.length} of these gifts`}. Reverse the award on Allocation first.`,
    );
  }

  // Taking live (non-archived) paid money out of a fund must not leave it
  // with more awarded than received. Archived tests are already left out of
  // fund balances, so removing them changes nothing there.
  const counted = donations.filter((d) => d.status === "paid" && !isArchivedTest(d.metadata));
  if (counted.length) {
    const balances = await fundBalances();
    const removing = new Map<string, number>();
    for (const d of counted) {
      for (const split of d.fundSplits) {
        removing.set(split.fundingSource, (removing.get(split.fundingSource) ?? 0) + Number(split.amount));
      }
    }
    for (const [source, amount] of removing) {
      const fund = balances.find((b) => b.fundingSource === source);
      if (fund && fund.remaining - amount < -0.005) {
        throw new TestRemovalError(
          "These gifts' money has already been awarded from their fund. Reverse those awards on Allocation first.",
        );
      }
    }
  }

  const removedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const d of donations) {
      const { awards: _awards, ...snapshot } = d;
      void _awards;
      await tx.$executeRaw`
        INSERT INTO "removed_test_donations"
          ("donation_id", "amount", "status", "donation_type", "donation_created_at", "snapshot", "reason", "removed_by", "removed_by_email", "removed_at")
        VALUES
          (${d.id}::uuid, ${d.totalAmount ?? d.amount}, ${d.status}, ${d.donationType}, ${d.createdAt},
           ${JSON.stringify(snapshot)}::jsonb, ${note}, ${actor.id}::uuid, ${actor.email}, ${removedAt})`;
    }
    // Checkout added each live paid gift to its campaign's counters; take it
    // back off. (Archived tests were already zeroed when they were archived.)
    for (const d of counted) {
      if (!d.campaignId) continue;
      await tx.$executeRaw`
        UPDATE "campaigns"
           SET "raised_amount" = GREATEST(0, "raised_amount" - ${d.totalAmount ?? d.amount}),
               "donor_count" = GREATEST(0, "donor_count" - 1)
         WHERE "id" = ${d.campaignId}::uuid`;
    }
    // Rows whose foreign key does not cascade.
    await tx.paymentEvent.deleteMany({ where: { donationId: { in: ids } } });
    await tx.campaignBacker.deleteMany({ where: { donationId: { in: ids } } });
    await tx.invoice.updateMany({ where: { donationId: { in: ids } }, data: { donationId: null } });
    await tx.scholarshipAward.updateMany({ where: { donationId: { in: ids } }, data: { donationId: null } });
    // Details, splits, allocations, receipts and recommendations cascade.
    await tx.donation.deleteMany({ where: { id: { in: ids } } });
  });

  const campaignIds = Array.from(new Set(donations.map((d) => d.campaignId).filter((id): id is string => Boolean(id))));
  for (const campaignId of campaignIds) await recomputeCampaignAwarded(campaignId).catch(() => null);

  return {
    removed: donations.length,
    amount: donations.reduce((sum, d) => sum + Number(d.totalAmount ?? d.amount), 0),
    campaignIds,
  };
}

/** Ids of every donation archived as a sandbox test, for the bulk removal. */
export async function archivedTestDonationIds(): Promise<string[]> {
  const rows = await prisma.donation.findMany({ where: ARCHIVED_TESTS_ONLY, select: { id: true } });
  return rows.map((r) => r.id);
}

