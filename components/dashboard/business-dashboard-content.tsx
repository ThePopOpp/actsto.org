import Link from "next/link";
import { Building2, Download, FileSpreadsheet, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const PLEDGE_ROWS = [
  {
    id: "1",
    label: "FY26 corporate pledge — low income",
    committed: 25000,
    recognized: 18500,
    status: "Active",
  },
  {
    id: "2",
    label: "Spring employee match window",
    committed: 10000,
    recognized: 3200,
    status: "Open",
  },
];

const INVOICE_ROWS = [
  { id: "inv-1042", period: "Q1 2026", amount: 5000, status: "Paid" },
  { id: "inv-1038", period: "Q4 2025", amount: 12500, status: "Paid" },
  { id: "inv-1031", period: "Q3 2025", amount: 8000, status: "Scheduled" },
];

export function BusinessDashboardContent() {
  const totalCommitted = PLEDGE_ROWS.reduce((s, r) => s + r.committed, 0);
  const totalRecognized = PLEDGE_ROWS.reduce((s, r) => s + r.recognized, 0);
  const pct = totalCommitted > 0 ? Math.round((totalRecognized / totalCommitted) * 100) : 0;

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Corporate Arizona tax-credit activity, pledge tracking, and finance-friendly exports — sample
        data for UI review.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                ${totalCommitted.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Committed (FY26 sample)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                ${totalRecognized.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Recognized toward pledge</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pledge fulfillment</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-primary">{pct}%</p>
            <Progress value={pct} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold text-primary">Programs &amp; pledges</h2>
        <div className="space-y-4">
          {PLEDGE_ROWS.map((row) => {
            const rowPct =
              row.committed > 0 ? Math.round((row.recognized / row.committed) * 100) : 0;
            return (
              <Card key={row.id} className="border-border/80">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{row.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                        ${row.recognized.toLocaleString()} of ${row.committed.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={row.status === "Active" ? "secondary" : "outline"}>{row.status}</Badge>
                  </div>
                  <Progress value={rowPct} className="mt-3 h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Invoices &amp; statements</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileSpreadsheet className="size-4" />
              CFO export (demo)
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="size-4" />
              ADOR packet (demo)
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {INVOICE_ROWS.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{inv.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.period}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ${inv.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.status === "Paid" ? "secondary" : "outline"}>{inv.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="border-dashed border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base text-primary">Employee match</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload roster or connect HRIS when available. Match window: <strong className="text-foreground">Apr 1 – May 15</strong>{" "}
          (sample). Coordinators receive digest on new submissions.
        </CardContent>
      </Card>

      <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Contact ACT corporate desk
      </Link>
    </div>
  );
}
