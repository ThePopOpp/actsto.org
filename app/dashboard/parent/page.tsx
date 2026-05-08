import { ParentDashboardContent } from "@/components/dashboard/parent-dashboard-content";
import { getLiveDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function ParentDashboardPage() {
  return <ParentDashboardContent campaigns={await getLiveDemoFamilyCampaigns()} />;
}
