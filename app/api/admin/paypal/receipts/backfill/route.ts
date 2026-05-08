import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { ensureTaxReceiptForDonation } from "@/lib/paypal/payment-records";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const donations = await prisma.donation.findMany({
    where: {
      paymentProvider: "paypal",
      status: "paid",
      taxReceipts: { none: {} },
    },
    select: {
      id: true,
      totalAmount: true,
      amount: true,
    },
    take: 100,
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  for (const donation of donations) {
    await ensureTaxReceiptForDonation(
      donation.id,
      String(donation.totalAmount ?? donation.amount),
    );
    created += 1;
  }

  return NextResponse.json({ ok: true, created });
}
