import { Download } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DOCS = [
  { id: "c1", label: "Arizona corporate tuition organization acknowledgment", format: "PDF" },
  { id: "c2", label: "Employee match program attestation — FY26", format: "PDF" },
  { id: "c3", label: "Vendor W-9 (on file)", format: "PDF" },
];

export default function BusinessCompliancePage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Compliance docs"
        description="Templates for review only — replace with signed artifacts from your compliance workflow."
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
