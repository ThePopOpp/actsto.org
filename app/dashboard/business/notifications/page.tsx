import { Bell } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const PREFS = [
  { id: "inv", label: "Invoice & payment notices", defaultChecked: true },
  { id: "pledge", label: "Pledge fulfillment alerts", defaultChecked: true },
  { id: "compliance", label: "Compliance & ADOR updates", defaultChecked: true },
];

export default function BusinessNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Corporate account alerts and regulatory reminders."
      />
      <Card className="border-border/80">
        <CardContent className="divide-y divide-border/60 p-0">
          {PREFS.map((p) => (
            <label
              key={p.id}
              htmlFor={`biz-notify-${p.id}`}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{p.label}</span>
              </div>
              <Checkbox id={`biz-notify-${p.id}`} defaultChecked={p.defaultChecked} />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
