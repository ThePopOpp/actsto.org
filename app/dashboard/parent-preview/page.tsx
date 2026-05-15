import { ParentDashboardContent } from "@/components/dashboard/parent-dashboard-content";
import { getDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function ParentPreviewPage() {
  return <ParentDashboardContent campaigns={await getDemoFamilyCampaigns()} basePath="/dashboard/parent-preview" />;
}
