import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";

const THREADS = [
  { id: "t1", from: "ACT Support", preview: "Your campaign hero image was approved.", time: "2h ago" },
  { id: "t2", from: "Valley Christian — Tuition", preview: "March statement is ready for review.", time: "1d ago" },
];

export default function ParentMessagesPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Messages"
        description="School and platform notices related to your students and campaigns. Full threading ships with your messaging backend."
      />
      <div className="space-y-3">
        {THREADS.map((t) => (
          <Card key={t.id} className="border-border/80">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-primary">{t.from}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.preview}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.time}</span>
                <Button size="sm" variant="outline">
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
