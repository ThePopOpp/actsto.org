import { AdminLegalClient } from "@/components/dashboard/admin/admin-legal-client";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminPreviewLegalPage() {
  return (
    <>
      <AdminPageHeader
        title="Legal"
        description="Edit the Terms of Service, Privacy Policy, and Communication Policy. Preview mode can load documents but saving requires a super admin session."
      />
      <AdminLegalClient />
    </>
  );
}
