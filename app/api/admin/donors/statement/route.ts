import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { streamToBuffer } from "@/lib/admin/invoices";
import { prisma } from "@/lib/prisma";
import { DonorStatementDocument, type StatementRow } from "@/components/dashboard/admin/donor-statement-pdf";

export const dynamic = "force-dynamic";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function day(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";
  const email = url.searchParams.get("email") ?? "";
  const name = url.searchParams.get("name") ?? "Donor";
  if (!userId && !email) return NextResponse.json({ error: "userId or email is required." }, { status: 400 });

  const donations = await prisma.donation.findMany({
    where: {
      status: "paid",
      ...(userId ? { userId } : { donationDetail: { donorEmail: { equals: email, mode: "insensitive" } } }),
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
    include: { campaign: { select: { title: true } }, taxReceipts: { orderBy: { createdAt: "desc" }, take: 1, select: { receiptNumber: true } } },
  });

  const rows: StatementRow[] = donations.map((d) => ({
    date: day(d.createdAt),
    campaign: d.campaign?.title ?? "General fund",
    amount: usd(Number(d.amount ?? 0)),
    receipt: d.taxReceipts[0]?.receiptNumber ?? "—",
  }));
  const total = donations.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
  const taxYears = Array.from(new Set(donations.map((d) => d.taxYear).filter(Boolean))) as number[];

  const data = {
    donorName: name,
    email,
    generatedAt: day(new Date()),
    taxYear: taxYears.length ? taxYears.join(", ") : String(new Date().getFullYear()),
    rows,
    total: usd(total),
    count: donations.length,
  };

  const buffer = await streamToBuffer(await pdf(DonorStatementDocument({ data })).toBuffer());
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="statement-${(name || "donor").replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
