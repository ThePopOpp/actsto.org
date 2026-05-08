import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getLiveDemoStudentCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function StudentCampaignsPage() {
  return (
    <RoleCampaignsHub
      campaigns={await getLiveDemoStudentCampaigns()}
      basePath="/dashboard/student"
      title="My campaign"
      description="Your public page and editor. Keep your story and goal current for donors."
    />
  );
}
