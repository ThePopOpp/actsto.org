import { BackersDashboard } from "@/components/dashboard/backers-dashboard";
import { requirePortalDashboardSession } from "@/lib/auth/session-guards";
import { getActSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function ParentBackersPage() {
  const session = requirePortalDashboardSession(
    await getActSession(),
    "parent",
    "/dashboard/parent/backers",
    "parent"
  );

  return <BackersDashboard session={session} backHref="/dashboard/parent" />;
}
