import { redirect } from "next/navigation";

import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getActSession } from "@/lib/auth/session-server";
import { getDashboardCampaignsForSession } from "@/lib/campaigns-source";

export default async function StudentCampaignsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/student/campaigns");

  return (
    <RoleCampaignsHub
      campaigns={await getDashboardCampaignsForSession(session)}
      basePath="/dashboard/student"
      title="My campaign"
      description="Your public page and editor. Keep your story and goal current for donors."
    />
  );
}
