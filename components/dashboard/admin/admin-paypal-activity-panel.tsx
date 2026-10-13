import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPaypalReceiptBackfillButton } from "@/components/dashboard/admin/admin-paypal-receipt-backfill-button";
import { ExpirePendingButton, FundingSourceCell } from "@/components/dashboard/admin/funding-source-cell";
import { RemoveTestDonationButton } from "@/components/dashboard/admin/remove-test-donation";
import { ARCHIVED_TESTS_ONLY } from "@/lib/donations/remove-test";
import { EXCLUDE_ARCHIVED_TESTS } from "@/lib/donors/server";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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

type PaypalActivityView = "all" | "payments" | "receipts" | "webhooks";

/** Status filter on the Payments table. */
export const PAYMENT_STATUS_FILTERS = [
  { id: "paid", label: "Paid", statuses: ["paid"] },
  { id: "pending", label: "Pending", statuses: ["pending"] },
  { id: "failed", label: "Failed / cancelled", statuses: ["failed", "cancelled"] },
  { id: "all", label: "All", statuses: null },
] as const;
export type PaymentStatusFilter = (typeof PAYMENT_STATUS_FILTERS)[number]["id"];

export function parsePaymentStatusFilter(value: unknown): PaymentStatusFilter {
  return PAYMENT_STATUS_FILTERS.some((f) => f.id === value) ? (value as PaymentStatusFilter) : "all";
}

export async function AdminPaypalActivityPanel({
  view = "all",
  status = "all",
}: {
  view?: PaypalActivityView;
  status?: PaymentStatusFilter;
}) {
  const statuses = PAYMENT_STATUS_FILTERS.find((f) => f.id === status)?.statuses ?? null;
  const [summary, recentDonations, recentEvents, recentReceipts, missingReceiptCount, archived] = await Promise.all([
    getPaymentSummary(),
    prisma.donation.findMany({
      // Archived sandbox tests are left out here exactly as on the Dashboard
      // and Allocation, so all three show the same paid total.
      where: {
        paymentProvider: "paypal",
        AND: [EXCLUDE_ARCHIVED_TESTS],
        ...(statuses ? { status: { in: [...statuses] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        campaign: { select: { title: true, slug: true } },
        taxReceipts: { orderBy: { createdAt: "desc" }, take: 1 },
        fundSplits: { select: { fundingSource: true, amount: true, status: true } },
      },
    }),
    prisma.paymentEvent.findMany({
      where: { provider: "paypal" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.taxReceipt.findMany({
      where: { donation: EXCLUDE_ARCHIVED_TESTS },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { donation: { select: { status: true, paymentProviderOrderId: true } } },
    }),
    prisma.donation.count({
      where: {
        paymentProvider: "paypal",
        status: "paid",
        taxReceipts: { none: {} },
        AND: [EXCLUDE_ARCHIVED_TESTS],
      },
    }),
    prisma.donation.aggregate({
      where: ARCHIVED_TESTS_ONLY,
      _count: { _all: true },
      _sum: { totalAmount: true, amount: true },
    }),
  ]);
  const archivedCount = archived._count._all;
  const archivedAmount = Number(archived._sum.totalAmount ?? archived._sum.amount ?? 0);

  return (
    <div className="mt-6 space-y-6">
      {view === "all" || view === "payments" ? (
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
      ) : null}

      {view === "all" || view === "payments" ? (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Recent PayPal donations</CardTitle>
          <CardDescription>
            Capture status, funding source, receipt and campaign for the latest 100 checkouts. Gifts marked Review were
            recorded before funding sources existed, or are quick gifts with an Overflow part; confirm or correct them.
            Paid volume here counts the same gifts as the Dashboard and Allocation: archived sandbox tests are left out
            everywhere.
          </CardDescription>
          <nav className="flex flex-wrap gap-1.5 pt-2" aria-label="Payment status">
            {PAYMENT_STATUS_FILTERS.map((f) => (
              <a
                key={f.id}
                href={`/dashboard/admin/billing${f.id === "all" ? "" : `?status=${f.id}`}`}
                aria-current={f.id === status ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  f.id === status ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <ExpirePendingButton pendingCount={summary.pendingCount} />
            <RemoveTestDonationButton mode="archived" count={archivedCount} amount={archivedAmount} />
          </div>
          {archivedCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {archivedCount} archived sandbox test donation{archivedCount === 1 ? "" : "s"} ({money(archivedAmount)}) are
              hidden from every total but still stored. Remove them to clear them out completely.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Funding source</th>
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Receipt</th>
                <th className="py-2 pr-4">PayPal order</th>
                <th className="py-2 pr-4">Capture</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {recentDonations.map((donation) => (
                <tr key={donation.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{dt(donation.createdAt)}</td>
                  <td className="py-3 pr-4">{statusBadge(donation.status)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{money(donation.totalAmount ?? donation.amount)}</td>
                  <td className="py-3 pr-4">
                    <FundingSourceCell
                      donationId={donation.id}
                      total={Number(donation.totalAmount ?? donation.amount)}
                      splits={donation.fundSplits.map((split) => ({
                        fundingSource: split.fundingSource,
                        amount: Number(split.amount),
                        status: split.status,
                      }))}
                    />
                  </td>
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
                  <td className="py-3 pr-4 font-mono text-xs">{donation.paymentProviderCaptureId ?? "-"}</td>
                  <td className="py-3">
                    <RemoveTestDonationButton
                      mode="one"
                      donationId={donation.id}
                      amount={Number(donation.totalAmount ?? donation.amount)}
                      label={dt(donation.createdAt)}
                    />
                  </td>
                </tr>
              ))}
              {recentDonations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    No donations with this status.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
      ) : null}

      <div className={view === "all" ? "grid gap-6 xl:grid-cols-2" : "space-y-6"}>
        {view === "all" || view === "webhooks" ? (
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
        ) : null}

        {view === "all" || view === "receipts" ? (
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
        ) : null}
      </div>
    </div>
  );
}

async function getPaymentSummary() {
  const rows = await prisma.donation.groupBy({
    by: ["status"],
    where: { paymentProvider: "paypal", AND: [EXCLUDE_ARCHIVED_TESTS] },
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
