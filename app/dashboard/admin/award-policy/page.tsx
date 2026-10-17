import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AwardPolicyManager } from "@/components/dashboard/admin/award-policy-manager";

export const dynamic = "force-dynamic";

export default function AwardPolicyPage() {
  return (
    <>
      <AdminPageHeader
        title="Award policy"
        description="The public summary of how ACTSTO awards scholarships, and the full Scholarship Award Policy (Super Admins only)."
      />
      <AwardPolicyManager />
    </>
  );
}
