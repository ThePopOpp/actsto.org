import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  FileText,
  Receipt,
  RotateCcw,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function money(value: unknown, exact = false) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: exact ? 2 : 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}
function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}
function startOfYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}
function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  if (status.includes("refund")) return <Badge className="bg-amber-600 hover:bg-amber-600">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

async function getData() {
  const yearStart = startOfYear();
  const monthStart = startOfMonth();
  const [yearAgg, monthAgg, pendingAgg, refundAgg, receiptsIssued, missingReceipts, invoiceOutstanding, invoiceTotalCount, failedEvents, recentPayments] =
    await Promise.all([
      prisma.donation.aggregate({ where: { status: "paid", createdAt: { gte: yearStart } }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
      prisma.donation.aggregate({ where: { status: "paid", createdAt: { gte: monthStart } }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
      prisma.donation.aggregate({ where: { status: "pending" }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
      prisma.donation.aggregate({ where: { status: { contains: "refund" } }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
      prisma.taxReceipt.count({ where: { status: { in: ["generated", "emailed"] } } }),
      prisma.donation.count({ where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } } }),
      prisma.invoice.aggregate({ where: { status: { in: ["sent", "overdue"] } }, _sum: { total: true }, _count: { _all: true } }),
      prisma.invoice.count(),
      prisma.paymentEvent.count({ where: { provider: "paypal", processed: false, eventType: { contains: "FAILED" } } }),
      prisma.donation.findMany({
        where: { paymentProvider: "paypal" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { campaign: { select: { title: true } }, taxReceipts: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
    ]);

  return {
    yearTotal: yearAgg._sum.totalAmount ?? yearAgg._sum.amount ?? 0,
    yearCount: yearAgg._count._all,
    monthTotal: monthAgg._sum.totalAmount ?? monthAgg._sum.amount ?? 0,
    monthCount: monthAgg._count._all,
    pendingTotal: pendingAgg._sum.totalAmount ?? pendingAgg._sum.amount ?? 0,
    pendingCount: pendingAgg._count._all,
    refundTotal: refundAgg._sum.totalAmount ?? refundAgg._sum.amount ?? 0,
    refundCount: refundAgg._count._all,
    receiptsIssued,
    missingReceipts,
    invoiceOutstandingTotal: invoiceOutstanding._sum.total ?? 0,
    invoiceOutstandingCount: invoiceOutstanding._count._all,
    invoiceTotalCount,
    failedEvents,
    recentPayments,
  };
}

export async function AdminAccountingHome({ basePath }: { basePath: string }) {
  const d = await getData();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Tile basePath={basePath} href="/dashboard/admin/billing" icon={TrendingUp} label="Donations YTD" value={money(d.yearTotal)} sub={`${d.yearCount} paid`} />
        <Tile basePath={basePath} href="/dashboard/admin/billing" icon={CreditCard} label="This month" value={money(d.monthTotal)} sub={`${d.monthCount} paid`} />
        <Tile basePath={basePath} href="/dashboard/admin/billing" icon={Timer} label="Pending" value={money(d.pendingTotal)} sub={`${d.pendingCount} donation${d.pendingCount === 1 ? "" : "s"}`} alert={d.pendingCount > 0} />
        <Tile basePath={basePath} href="/dashboard/admin/billing" icon={RotateCcw} label="Refunded" value={money(d.refundTotal)} sub={`${d.refundCount} record${d.refundCount === 1 ? "" : "s"}`} />
        <Tile basePath={basePath} href="/dashboard/admin/receipts" icon={Receipt} label="Receipts issued" value={String(d.receiptsIssued)} sub="Tax receipts" />
        <Tile basePath={basePath} href="/dashboard/admin/receipts" icon={Receipt} label="Missing receipts" value={String(d.missingReceipts)} sub="Paid, no receipt" alert={d.missingReceipts > 0} />
        <Tile basePath={basePath} href="/dashboard/admin/invoices" icon={FileText} label="Invoices due" value={money(d.invoiceOutstandingTotal)} sub={`${d.invoiceOutstandingCount} of ${d.invoiceTotalCount}`} alert={d.invoiceOutstandingCount > 0} />
        <Tile basePath={basePath} href="/dashboard/admin/billing" icon={AlertCircle} label="Failed events" value={String(d.failedEvents)} sub="PayPal" alert={d.failedEvents > 0} />
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ShortcutCard basePath={basePath} href="/dashboard/admin/billing" icon={CreditCard} label="Payments" desc="PayPal activity & webhooks" />
        <ShortcutCard basePath={basePath} href="/dashboard/admin/invoices" icon={FileText} label="Invoices" desc="Bill business pledges" />
        <ShortcutCard basePath={basePath} href="/dashboard/admin/receipts" icon={Receipt} label="Receipts" desc="Tax receipts" />
        <ShortcutCard basePath={basePath} href="/dashboard/admin/tax-documents" icon={Wallet} label="Tax Documents" desc="Credit limits & disclosure" />
      </div>

      {/* Recent payments (relocated from the Overview) */}
      <Card className="border-border/80">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Recent payments</p>
              <p className="text-xs text-muted-foreground">Latest PayPal donation records and receipt status.</p>
            </div>
            <Link href={adminHrefForBase("/dashboard/admin/billing", basePath)} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
              Payments <ArrowRight className="ml-0.5 size-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {d.recentPayments.length > 0 ? (
                  d.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 text-muted-foreground">{dt(p.createdAt)}</td>
                      <td className="py-2.5 pr-4">{statusBadge(p.status)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{money(p.totalAmount ?? p.amount, true)}</td>
                      <td className="py-2.5 pr-4">{p.campaign?.title ?? "General fund"}</td>
                      <td className="py-2.5 font-mono text-xs">{p.taxReceipts[0]?.receiptNumber ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">No PayPal donations yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({
  href,
  basePath,
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  href: string;
  basePath: string;
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Link href={adminHrefForBase(href, basePath)} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card size="sm" className="h-full p-3 transition-shadow group-hover:shadow-md">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <Icon className={cn("size-3.5 shrink-0", alert ? "text-act-red" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums sm:text-2xl", alert ? "text-act-red" : "text-primary")}>{value}</p>
          {sub ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function ShortcutCard({ href, basePath, icon: Icon, label, desc }: { href: string; basePath: string; icon: LucideIcon; label: string; desc: string }) {
  return (
    <Link href={adminHrefForBase(href, basePath)} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-primary">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
