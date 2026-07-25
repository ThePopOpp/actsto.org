import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ContactsWorkspace } from "@/components/dashboard/admin/contacts/contacts-workspace";

export const dynamic = "force-dynamic";

export default function AdminContactsPage() {
  return (
    <>
      <AdminPageHeader title="Contacts" description="Everyone in your world — users and non-users. Views, import/export, and quick call/SMS/email." />
      <ContactsWorkspace />
    </>
  );
}
