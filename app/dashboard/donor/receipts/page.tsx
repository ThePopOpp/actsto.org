import { Download } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DOCS = [
  { id: "dr1", label: "2025 Arizona tax-credit summary", format: "PDF" },
  { id: "dr2", label: "Q1 2026 gift acknowledgments", format: "PDF" },
];

export default function DonorReceiptsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Receipts & tax"
        description="Download donor acknowledgments and annual summaries for your records."
      />
      <div className="space-y-3">
        {DOCS.map((d) => (
          <Card key={d.id} className="border-border/80">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-primary">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.format}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="size-4" />
                Download (demo)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
