import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { StateAidMatrixEditor } from "@/components/dashboard/admin/eligibility/state-aid-matrix-editor";

export const dynamic = "force-dynamic";

export default function StateAidMatrixPage() {
  return (
    <>
      <AdminPageHeader
        title="90% state aid matrix"
        description="ADOR's 90%-of-state-aid amounts by special education category and grade, for each school year. A student's disabled/displaced cap is the lesser of tuition and this amount, across all STOs. No disabled/displaced payment can be sent for a year until its matrix is entered."
      />
      <StateAidMatrixEditor />
    </>
  );
}
