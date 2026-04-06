import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";

const ROWS = [
  { id: "1", date: "2026-03-12", donor: "Thompson Family Trust", amount: 1000, fund: "Overflow", campaign: "Waters Family" },
  { id: "2", date: "2026-02-28", donor: "Anonymous", amount: 250, fund: "Original", campaign: "Waters Family" },
  { id: "3", date: "2026-01-05", donor: "Desert Springs Church", amount: 500, fund: "Original", campaign: "Leavitt Family" },
];

export default function ParentDonationsReceivedPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Donations received"
        description="Gifts toward your family campaigns. Export for school reconciliation and thank-you workflows (demo UI)."
      />
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Credit</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3">{r.donor}</td>
                  <td className="px-4 py-3">{r.campaign}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{r.fund}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    ${r.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                      Thank
                    </Button>
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
