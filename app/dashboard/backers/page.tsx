import { redirect } from "next/navigation";

import { BackersDashboard } from "@/components/dashboard/backers-dashboard";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { getActSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function BackersPage() {
  const session = await getActSession().catch(() => null);
  if (!session) redirect("/login?next=/dashboard/backers");
  if (session.role === "super_admin") redirect("/dashboard/admin/backers");
  if (session.role === "parent") redirect("/dashboard/parent/backers");

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <BackersDashboard session={session} backHref={dashboardPathForRole(session.role)} />
    </div>
  );
}
