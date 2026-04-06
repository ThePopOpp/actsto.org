import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TAX_ROWS = [
  { id: "t1", year: "2025", creditType: "Corporate STO", amount: 12500, status: "Filed" },
  { id: "t2", year: "2026", creditType: "Corporate STO", amount: 5000, status: "In progress" },
];

export default function BusinessTaxesPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Taxes"
        description="Track tax-credit totals and filing status for your business donor account."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">YTD credit-eligible gifts</p>
            <p className="mt-2 text-2xl font-semibold text-primary tabular-nums">$5,000</p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Last filed year</p>
            <p className="mt-2 text-2xl font-semibold text-primary">2025</p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pending documents</p>
            <p className="mt-2 text-2xl font-semibold text-primary">2</p>
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Tax year</th>
                <th className="px-4 py-3">Credit type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {TAX_ROWS.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">{r.year}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.creditType}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">${r.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "Filed" ? "secondary" : "outline"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                      Open docs
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
