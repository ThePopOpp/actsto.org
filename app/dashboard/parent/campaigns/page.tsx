import { redirect } from "next/navigation";

import { RoleCampaignsHub } from "@/components/dashboard/role-campaigns-hub";
import { getActSession } from "@/lib/auth/session-server";
import { getDashboardCampaignsForSession } from "@/lib/campaigns-source";

export default async function ParentCampaignsPage() {
  const session = await getActSession();
  if (!session) redirect("/login");

  return (
    <RoleCampaignsHub
      campaigns={await getDashboardCampaignsForSession(session)}
      basePath="/dashboard/parent"
      description="Manage campaign drafts, review what is still missing, and edit live campaign details."
    />
  );
}
