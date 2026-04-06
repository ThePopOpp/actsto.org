import { redirect } from "next/navigation";

import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { getActSession } from "@/lib/auth/session-server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getActSession();
  const { error } = await searchParams;

  if (session) {
    redirect(dashboardPathForRole(session.role));
  }

  return <DashboardHub error={error} />;
}
