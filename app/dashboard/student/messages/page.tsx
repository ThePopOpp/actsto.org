import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";

const THREADS = [
  { id: "s1", from: "ACT Support", preview: "Thanks for updating your campaign story.", time: "3d ago" },
];

export default function StudentMessagesPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Messages"
        description="Notes from your school and the ACT team about your campaign and tuition account."
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
