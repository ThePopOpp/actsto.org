import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const PLEDGE_ROWS = [
  {
    id: "1",
    label: "FY26 corporate pledge — low income",
    committed: 25_000,
    recognized: 18_500,
    status: "Active",
  },
  {
    id: "2",
    label: "Spring employee match window",
    committed: 10_000,
    recognized: 3_200,
    status: "Open",
  },
];

export default function BusinessGivingPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Giving & pledges"
        description="Track committed Arizona tax-credit amounts and recognition toward each program (sample data)."
      />
      <div className="space-y-4">
        {PLEDGE_ROWS.map((row) => {
          const rowPct = row.committed > 0 ? Math.round((row.recognized / row.committed) * 100) : 0;
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
  );
}
