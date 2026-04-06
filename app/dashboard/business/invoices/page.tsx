import { Download, FileSpreadsheet } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const INVOICE_ROWS = [
  { id: "inv-1042", period: "Q1 2026", amount: 5000, status: "Paid" },
  { id: "inv-1038", period: "Q4 2025", amount: 12_500, status: "Paid" },
  { id: "inv-1031", period: "Q3 2025", amount: 8000, status: "Scheduled" },
];

export default function BusinessInvoicesPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Invoices & receipts"
        description="Statements for corporate giving and employee-match windows. Finance exports are demo-only."
      />
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
  );
}
