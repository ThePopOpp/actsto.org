import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function ParentPreviewCampaignsPage() {
  return <RoleCampaignsHub campaigns={await getDemoFamilyCampaigns()} basePath="/dashboard/parent-preview" />;
}
