import { AdminSettingsForm } from "@/components/dashboard/admin/admin-settings-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Eligibility rules, and links to every other screen where site settings are changed."
      />
      <AdminSettingsForm />
    </>
  );
}
