import { AdminLegalClient } from "@/components/dashboard/admin/admin-legal-client";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminLegalPage() {
  return (
    <>
      <AdminPageHeader
        title="Legal"
        description="Terms of Service, Privacy Policy, and Communication Policy for public /legal pages. Built-in defaults match the live policy components; saving stores HTML in the database and overrides those defaults. You can paste from Word (Save as Web Page, Filtered) or compose in the editor. Unauthenticated preview can load and edit; saving and reset require a signed-in Super Admin."
      />
      <AdminLegalClient />
    </>
  );
}
