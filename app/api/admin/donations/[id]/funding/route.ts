import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { fundBalances } from "@/lib/allocation/server";
import { FUNDING_SOURCE_LABEL, isFundingSource, type FundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * PUT /api/admin/donations/:id/funding
 * Body: { splits: [{ fundingSource, amount }], note } — or { confirm: true } to
 * confirm the existing split as it stands.
 *
 * Funding sources are fixed once money is awarded: a change is refused when an
 * award draws on this donation directly, or when moving the dollars would leave
 * a fund with more awarded than received. Every change is audit logged.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    splits?: { fundingSource?: string; amount?: number }[];
    note?: string;
    confirm?: boolean;
  } | null;

  const donation = await prisma.donation.findUnique({
    where: { id },
    select: { id: true, status: true, amount: true, totalAmount: true, fundSplits: true, _count: { select: { awards: true } } },
  });
  if (!donation) return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  const before = donation.fundSplits.map((s) => ({ fundingSource: s.fundingSource, amount: Number(s.amount), status: s.status }));

  if (body?.confirm) {
    await prisma.donationFundSplit.updateMany({
      where: { donationId: id, status: "needs_review" },
      data: { status: "confirmed", setByEmail: auth.actor.email, setBy: auth.actor.id },
    });
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: "donation.funding_confirm",
      entityType: "donation",
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  }

  const total = round2(Number(donation.totalAmount ?? donation.amount));
  const splits = (body?.splits ?? [])
    .map((s) => ({ fundingSource: String(s.fundingSource ?? ""), amount: round2(Number(s.amount)) }))
    .filter((s) => s.amount > 0);
  if (!splits.length || splits.some((s) => !isFundingSource(s.fundingSource))) {
    return NextResponse.json({ error: "Choose a fund for every part of the gift." }, { status: 400 });
  }
  const sum = round2(splits.reduce((s, x) => s + x.amount, 0));
  if (Math.abs(sum - total) > 0.005) {
    return NextResponse.json({ error: `The parts add up to $${sum}, but the gift was $${total}.` }, { status: 400 });
  }
  if (donation._count.awards > 0) {
    return NextResponse.json({ error: "An award draws on this gift, so its funding source can't change." }, { status: 409 });
  }

  // Taking money out of a fund that has already awarded it is refused.
  if (donation.status === "paid") {
    const balances = await fundBalances();
    const delta = new Map<string, number>();
    for (const s of before) delta.set(s.fundingSource, (delta.get(s.fundingSource) ?? 0) - s.amount);
    for (const s of splits) delta.set(s.fundingSource, (delta.get(s.fundingSource) ?? 0) + s.amount);
    for (const [source, change] of delta) {
      const fund = balances.find((b) => b.fundingSource === source);
      if (fund && change < 0 && fund.remaining + change < -0.005) {
        return NextResponse.json(
          {
            error: `${FUNDING_SOURCE_LABEL[source as FundingSource]} has already awarded this money, so it can't be moved to another fund.`,
          },
          { status: 409 },
        );
      }
    }
  }

  const note = (body?.note ?? "").trim() || null;
  await prisma.$transaction([
    prisma.donationFundSplit.deleteMany({ where: { donationId: id } }),
    prisma.donationFundSplit.createMany({
      data: splits.map((s) => ({
        donationId: id,
        fundingSource: s.fundingSource,
        amount: s.amount,
        status: "confirmed",
        setBy: auth.actor.id,
        setByEmail: auth.actor.email,
        note,
      })),
    }),
  ]);
  await logAdminActivity({
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
    action: "donation.funding_change",
    entityType: "donation",
    entityId: id,
    before,
    after: { splits, note },
  });
  return NextResponse.json({ ok: true });
}
