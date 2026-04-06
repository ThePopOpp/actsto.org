import { AdminInboxWorkspace } from "@/components/dashboard/admin/admin-inbox-workspace";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminMessagesPage() {
  return (
    <>
      <AdminPageHeader
        title="Inbox"
        description="Review supporter and family messages in context (role, campaign, channel). Compose one-to-one or segmented emails — wire to your ESP when ready."
      />
      <AdminInboxWorkspace />
    </>
  );
}
