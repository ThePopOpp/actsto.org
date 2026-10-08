import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AllocationTool } from "@/components/dashboard/admin/allocation/allocation-tool";

export const dynamic = "force-dynamic";

export default function AllocationPage() {
  return (
    <>
      <AdminPageHeader
        title="Allocation"
        description="Award donated money to eligible students, then record what is sent to each school. Restricted funds only reach eligible students, and payments are checked against tuition and the caps."
      />
      <AllocationTool />
    </>
  );
}
