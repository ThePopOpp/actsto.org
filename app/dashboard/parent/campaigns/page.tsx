import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getLiveDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function ParentCampaignsPage() {
  return <RoleCampaignsHub campaigns={await getLiveDemoFamilyCampaigns()} basePath="/dashboard/parent" />;
}
