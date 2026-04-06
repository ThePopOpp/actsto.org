import { AdminLegalClient } from "@/components/dashboard/admin/admin-legal-client";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminLegalPage() {
  return (
    <>
      <AdminPageHeader
        title="Legal"
        description="Edit the Terms of Service, Privacy Policy, and Communication Policy shown on public /legal pages. Saved HTML is stored in the database; until you save, visitors see the built-in default copy (aligned with your current policies). Paste content from your Word documents (Save as Web Page, Filtered) or compose here."
      />
      <AdminLegalClient />
    </>
  );
}
