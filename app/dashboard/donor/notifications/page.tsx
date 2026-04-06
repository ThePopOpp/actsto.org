import { Bell } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const PREFS = [
  { id: "receipt", label: "Receipt & tax document ready", defaultChecked: true },
  { id: "campaign", label: "Updates from saved campaigns", defaultChecked: true },
  { id: "match", label: "Matching funds and deadlines", defaultChecked: true },
];

export default function DonorNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Email and in-app alerts for your donor account."
      />
      <Card className="border-border/80">
        <CardContent className="divide-y divide-border/60 p-0">
          {PREFS.map((p) => (
            <label
              key={p.id}
              htmlFor={`donor-notify-${p.id}`}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{p.label}</span>
              </div>
              <Checkbox id={`donor-notify-${p.id}`} defaultChecked={p.defaultChecked} />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
