import { AdminNotificationsForm } from "@/components/dashboard/admin/admin-notifications-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminNotificationsPage() {
  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Channels, triggered supporter messages, admin alerts, throttles, and send audit."
      />
      <AdminNotificationsForm />
    </>
  );
}
