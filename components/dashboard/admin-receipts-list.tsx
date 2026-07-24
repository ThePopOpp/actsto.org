import Link from "next/link";
import { Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(amount) ? amount : 0);
}
function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", month: "short", day: "numeric", year: "numeric" }).format(value);
}
function statusBadge(status: string) {
  if (status === "emailed") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Emailed</Badge>;
  if (status === "generated") return <Badge variant="secondary">Generated</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

async function getData() {
  const [rows, total, generated, emailed, pendingErr, missing] = await Promise.all([
    prisma.taxReceipt.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { donation: { select: { campaign: { select: { title: true } } } } } }),
    prisma.taxReceipt.count(),
    prisma.taxReceipt.count({ where: { status: "generated" } }),
    prisma.taxReceipt.count({ where: { status: "emailed" } }),
    prisma.taxReceipt.count({ where: { status: { in: ["pending", "error"] } } }),
    prisma.donation.count({ where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } } }),
  ]);
  return { rows, total, generated, emailed, pendingErr, missing };
}

export async function AdminReceiptsList() {
  const d = await getData();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total" value={d.total} />
        <Stat label="Emailed" value={d.emailed} />
        <Stat label="Generated" value={d.generated} />
        <Stat label="Pending / error" value={d.pendingErr} alert={d.pendingErr > 0} />
        <Stat label="Missing" value={d.missing} alert={d.missing > 0} />
      </div>

      <Card className="border-border/80">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Receipt #</th>
                  <th className="py-2 pr-4">Issued to</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4">Tax year</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Issued</th>
                  <th className="py-2">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {d.rows.length > 0 ? (
                  d.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.receiptNumber}</td>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-primary">{r.issuedToName || "—"}</p>
                        {r.issuedToEmail ? <p className="text-xs text-muted-foreground">{r.issuedToEmail}</p> : null}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{money(r.amount)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{r.taxYear ?? "-"}</td>
                      <td className="py-2.5 pr-4">{statusBadge(r.status)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{dt(r.issuedAt)}</td>
                      <td className="py-2.5">
                        {r.receiptPdfUrl ? (
                          <Link href={r.receiptPdfUrl} target="_blank" className="text-primary underline underline-offset-2">
                            View
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 size-6 opacity-50" />
                      No tax receipts yet. Receipts generate automatically for paid PayPal donations.
                    </td>
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

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card size="sm" className="p-3">
      <CardContent className="p-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${alert ? "text-act-red" : "text-primary"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
