import { AdminCampaignsManager } from "@/components/dashboard/admin/admin-campaigns-manager";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export const dynamic = "force-dynamic";

export default function AdminCampaignsPage() {
  return (
    <>
      <AdminPageHeader
        title="Campaign management"
        description="Review and control live campaigns — approve, feature, schedule, archive, or delete across Card, List, Table, Kanban, Calendar, and Map views."
      />
      <AdminCampaignsManager />
    </>
  );
}
