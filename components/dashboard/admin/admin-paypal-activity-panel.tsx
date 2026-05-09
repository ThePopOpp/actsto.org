import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPaypalReceiptBackfillButton } from "@/components/dashboard/admin/admin-paypal-receipt-backfill-button";
import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}

function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(value);
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  if (status === "refunded" || status === "partially_refunded") {
    return <Badge className="bg-amber-600 hover:bg-amber-600">{status.replace("_", " ")}</Badge>;
  }
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export async function AdminPaypalActivityPanel() {
  const [summary, recentDonations, recentEvents, recentReceipts, missingReceiptCount] = await Promise.all([
    getPaymentSummary(),
    prisma.donation.findMany({
      where: { paymentProvider: "paypal" },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        campaign: { select: { title: true, slug: true } },
        taxReceipts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.paymentEvent.findMany({
      where: { provider: "paypal" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.taxReceipt.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { donation: { select: { status: true, paymentProviderOrderId: true } } },
    }),
    prisma.donation.count({
      where: {
        paymentProvider: "paypal",
        status: "paid",
        taxReceipts: { none: {} },
      },
    }),
  ]);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription>Paid volume</CardDescription>
            <CardTitle className="font-heading text-2xl text-primary">{money(summary.paidVolume)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription>Paid donations</CardDescription>
            <CardTitle className="font-heading text-2xl text-primary">{summary.paidCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="font-heading text-2xl text-primary">{summary.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription>Refund / cancel / fail</CardDescription>
            <CardTitle className="font-heading text-2xl text-primary">{summary.exceptionCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Recent PayPal donations</CardTitle>
          <CardDescription>Capture status, receipt generation, and campaign association.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Receipt</th>
                <th className="py-2 pr-4">PayPal order</th>
                <th className="py-2">Capture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {recentDonations.map((donation) => (
                <tr key={donation.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{dt(donation.createdAt)}</td>
                  <td className="py-3 pr-4">{statusBadge(donation.status)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{money(donation.totalAmount ?? donation.amount)}</td>
                  <td className="py-3 pr-4">
                    {donation.campaign?.title ??
                      (typeof donation.metadata === "object" &&
                      donation.metadata &&
                      "campaignTitle" in donation.metadata
                        ? String(donation.metadata.campaignTitle)
                        : "General fund")}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {donation.taxReceipts[0]?.receiptNumber ?? "-"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{donation.paymentProviderOrderId ?? "-"}</td>
                  <td className="py-3 font-mono text-xs">{donation.paymentProviderCaptureId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Webhook and payment events</CardTitle>
            <CardDescription>Use this to confirm PayPal webhook delivery and processing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-primary">{event.eventType}</span>
                  <Badge variant={event.processed ? "secondary" : "outline"}>
                    {event.processed ? "Processed" : "Logged"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dt(event.createdAt)} · order{" "}
                  <span className="font-mono">{event.providerOrderId ?? "-"}</span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Generated tax receipts</CardTitle>
            <CardDescription>
              Receipt rows created automatically for paid donations.
              {missingReceiptCount > 0 ? ` ${missingReceiptCount} paid donation(s) need backfill.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {missingReceiptCount > 0 ? <AdminPaypalReceiptBackfillButton /> : null}
            {recentReceipts.map((receipt) => (
              <div key={receipt.id} className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-primary">{receipt.receiptNumber}</span>
                  <Badge variant="secondary">{receipt.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {money(receipt.amount)} · issued {dt(receipt.issuedAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  donation {receipt.donation.status} · order{" "}
                  <span className="font-mono">{receipt.donation.paymentProviderOrderId ?? "-"}</span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function getPaymentSummary() {
  const rows = await prisma.donation.groupBy({
    by: ["status"],
    where: { paymentProvider: "paypal" },
    _count: { _all: true },
    _sum: { totalAmount: true, amount: true },
  });

  const paid = rows.find((row) => row.status === "paid");
  const pending = rows.find((row) => row.status === "pending");
  const exceptionCount = rows
    .filter((row) => ["cancelled", "failed", "refunded", "partially_refunded"].includes(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    paidVolume: paid?._sum.totalAmount ?? paid?._sum.amount ?? 0,
    paidCount: paid?._count._all ?? 0,
    pendingCount: pending?._count._all ?? 0,
    exceptionCount,
  };
}
