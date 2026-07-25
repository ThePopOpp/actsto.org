import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ConsentManager } from "@/components/dashboard/admin/consent-manager";

export const dynamic = "force-dynamic";

export default function AdminConsentPage() {
  return (
    <>
      <AdminPageHeader
        title="Consent & communications"
        description="Auditable email and SMS consent — every opt-in/out with full evidence (disclosure version, source, IP, staff actor), plus staff-recorded actions."
      />
      <ConsentManager />
    </>
  );
}
