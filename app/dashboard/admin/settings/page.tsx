import { AdminSettingsForm } from "@/components/dashboard/admin/admin-settings-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Domains, analytics, tax-year display, campaign defaults, compliance copy, and feature flags."
      />
      <AdminSettingsForm />
    </>
  );
}
