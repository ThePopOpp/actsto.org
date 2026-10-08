import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { CapsEditor } from "@/components/dashboard/admin/eligibility/caps-editor";

export const dynamic = "force-dynamic";

export default function ScholarshipCapsPage() {
  return (
    <>
      <AdminPageHeader
        title="Scholarship caps"
        description="The most that can be sent to a school for one student in a school year, from a given fund. Enter next year's figures here when ADOR publishes them, with no deploy."
      />
      <CapsEditor />
    </>
  );
}
