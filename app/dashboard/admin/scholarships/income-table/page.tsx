import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { IncomeTableEditor } from "@/components/dashboard/admin/eligibility/income-table-editor";

export const dynamic = "force-dynamic";

export default function IncomeTablePage() {
  return (
    <>
      <AdminPageHeader
        title="Low-income table"
        description="Household income limits for the corporate low-income scholarship, one table per school year. Low-income eligibility on each application is calculated from these figures. Changes take effect immediately, with no deploy."
      />
      <IncomeTableEditor />
    </>
  );
}
