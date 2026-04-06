import { Bell } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const PREFS = [
  { id: "pledge", label: "New pledge or match on my campaign", defaultChecked: true },
  { id: "deadline", label: "Campaign deadline reminders", defaultChecked: true },
  { id: "school", label: "School billing & tuition notices", defaultChecked: true },
  { id: "marketing", label: "Tips and ACT product updates", defaultChecked: false },
];

export default function ParentNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Choose how we reach you when something changes on your account or campaigns."
      />
      <Card className="border-border/80">
        <CardContent className="divide-y divide-border/60 p-0">
          {PREFS.map((p) => (
            <label
              key={p.id}
              htmlFor={`notify-${p.id}`}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{p.label}</span>
              </div>
              <Checkbox id={`notify-${p.id}`} defaultChecked={p.defaultChecked} />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
