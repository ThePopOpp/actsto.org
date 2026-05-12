import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { UserNotificationsPanel } from "@/components/dashboard/notifications/user-notifications-panel";

export default function BusinessNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Corporate account alerts, receipts, and regulatory reminders."
      />
      <UserNotificationsPanel />
    </div>
  );
}
