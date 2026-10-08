import { redirect } from "next/navigation";

import { BusinessDashboardContent } from "@/components/dashboard/business-dashboard-content";
import { getActSession } from "@/lib/auth/session-server";
import { getBusinessAccount } from "@/lib/donors/business-account";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/business");
  return <BusinessDashboardContent account={await getBusinessAccount(session)} />;
}
