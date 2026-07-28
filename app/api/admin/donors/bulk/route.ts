import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { ensureTaxReceiptForDonation } from "@/lib/paypal/payment-records";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Bulk actions over selected donation ids. */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { ids?: string[]; action?: string } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  const action = body?.action;
  if (!ids.length) return NextResponse.json({ error: "No donations selected." }, { status: 400 });

  if (action === "generate_receipts") {
    const donations = await prisma.donation.findMany({
      where: { id: { in: ids }, status: "paid" },
      select: { id: true, totalAmount: true, amount: true },
    });
    let created = 0;
    for (const d of donations) {
      await ensureTaxReceiptForDonation(d.id, String(d.totalAmount ?? d.amount)).catch(() => null);
      created += 1;
    }
    return NextResponse.json({ ok: true, processed: created });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
