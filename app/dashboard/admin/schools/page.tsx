import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { SchoolsManager } from "@/components/dashboard/admin/schools/schools-manager";

export const dynamic = "force-dynamic";

export default function AdminSchoolsPage() {
  return (
    <>
      <AdminPageHeader
        title="Schools"
        description="One list of schools, each with one record. Allocation, caps and reporting group by school, so approve new schools, merge duplicates and link typed school names here."
      />
      <SchoolsManager />
    </>
  );
}
