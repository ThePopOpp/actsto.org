import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default function ParentCampaignsPage() {
  return <RoleCampaignsHub campaigns={getDemoFamilyCampaigns()} basePath="/dashboard/parent" />;
}
