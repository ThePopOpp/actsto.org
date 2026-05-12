import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { UserNotificationsPanel } from "@/components/dashboard/notifications/user-notifications-panel";

export default function DonorNotificationsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Notifications"
        description="Email, SMS, and in-app alerts for your donor account."
      />
      <UserNotificationsPanel />
    </div>
  );
}
