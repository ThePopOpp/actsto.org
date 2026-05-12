import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { UserNotificationsPanel } from "@/components/dashboard/notifications/user-notifications-panel";

export default function ParentNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Choose how we reach you when something changes on your account or campaigns."
      />
      <UserNotificationsPanel />
    </div>
  );
}
