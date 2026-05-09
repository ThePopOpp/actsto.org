import { AdminCommunicationsTabs } from "@/components/dashboard/admin/admin-communications-tabs";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminSmsPage() {
  return (
    <>
      <AdminPageHeader
        title="Communications"
        description="SMS inbox, one-to-one sends, bulk messaging, templates, and Twilio credentials."
      />
      <AdminCommunicationsTabs />
    </>
  );
}
