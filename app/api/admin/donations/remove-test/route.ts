import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireAllocationActor } from "@/lib/allocation/api";
import { archivedTestDonationIds, removeTestDonations, TestRemovalError } from "@/lib/donations/remove-test";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/remove-test
 * Body: { donationIds: string[], reason } — or { allArchived: true, reason } to
 * remove every donation already archived as a pre-launch sandbox test.
 *
 * Super Admin only. Permanently removes the donations and their receipts,
 * PayPal records and allocations; a copy of each is kept in
 * removed_test_donations. Every removal is audit logged.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as
    | { donationIds?: unknown; allArchived?: boolean; reason?: string }
    | null;

  const ids = body?.allArchived
    ? await archivedTestDonationIds()
    : Array.isArray(body?.donationIds)
      ? body.donationIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))
      : [];
  if (ids.length === 0) return NextResponse.json({ error: "No donations to remove." }, { status: 400 });

  try {
    const result = await removeTestDonations(ids, auth.actor, body?.reason ?? "");
    await logAdminActivity({
      actorId: auth.actor.id,
      actorEmail: auth.actor.email,
      action: "donation.remove_test",
      entityType: "donation",
      entityId: ids.length === 1 ? ids[0] : null,
      after: { donationIds: ids, removed: result.removed, amount: result.amount, reason: body?.reason ?? "" },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof TestRemovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[remove-test]", error);
    return NextResponse.json({ error: "Nothing was removed. Try again." }, { status: 500 });
  }
}
