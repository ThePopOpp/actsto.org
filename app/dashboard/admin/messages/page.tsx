import { AdminInboxWorkspace } from "@/components/dashboard/admin/admin-inbox-workspace";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminMessagesPage() {
  return (
    <>
      <AdminPageHeader
        title="Inbox"
        description="Review supporter and family email messages in context. Compose one-to-one or segmented emails from hello@actsto.org."
      />
      <AdminInboxWorkspace />
    </>
  );
}
