import { Download } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MOCK_GIFTS = [
  { id: "1", date: "2026-03-15", campaign: "Waters Family Fundraiser", amount: 500, credit: "Original" },
  { id: "2", date: "2025-12-02", campaign: "Leavitt Family Fundraiser", amount: 1000, credit: "Overflow" },
  { id: "3", date: "2025-08-20", campaign: "ACT General Fund", amount: 250, credit: "Original" },
];

export default function DonorDonationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Donations"
        description="Your Arizona tax-credit gifts and printable acknowledgments. Confirm annual limits with your tax advisor."
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {MOCK_GIFTS.length} gifts on file (sample)
        </p>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="size-4" />
          Export (demo)
        </Button>
      </div>
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Credit type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {MOCK_GIFTS.map((g) => (
                <tr key={g.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{g.date}</td>
                  <td className="px-4 py-3">{g.campaign}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{g.credit}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    ${g.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                      Receipt
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
