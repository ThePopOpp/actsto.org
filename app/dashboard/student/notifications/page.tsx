import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { UserNotificationsPanel } from "@/components/dashboard/notifications/user-notifications-panel";

export default function StudentNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Control alerts for your campaign, school, and student account."
      />
      <UserNotificationsPanel />
    </div>
  );
}
