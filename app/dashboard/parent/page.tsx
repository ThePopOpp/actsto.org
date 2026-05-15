import { ParentDashboardContent } from "@/components/dashboard/parent-dashboard-content";
import { getActSession } from "@/lib/auth/session-server";
import { getDashboardCampaignsForSession } from "@/lib/campaigns-source";

export default async function ParentDashboardPage() {
  const session = await getActSession();
  const campaigns = session ? await getDashboardCampaignsForSession(session) : [];

  return <ParentDashboardContent campaigns={campaigns} />;
}
