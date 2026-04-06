import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getDemoStudentCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default function StudentCampaignsPage() {
  return (
    <RoleCampaignsHub
      campaigns={getDemoStudentCampaigns()}
      basePath="/dashboard/student"
      title="My campaign"
      description="Your public page and editor. Keep your story and goal current for donors."
    />
  );
}
