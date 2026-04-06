import { AdminCtaBuilderForm } from "@/components/dashboard/admin/admin-cta-builder-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminCtaBuilderPage() {
  return (
    <>
      <AdminPageHeader
        title="CTA blocks"
        description="Configure call-to-action strips for the public site: copy, buttons, imagery, placement, and colors. Saves are demo-only until you connect a CMS or API."
      />
      <AdminCtaBuilderForm />
    </>
  );
}
