import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { requirePortalDashboardSession } from "@/lib/auth/session-guards";
import { getActSession } from "@/lib/auth/session-server";

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = requirePortalDashboardSession(
    await getActSession(),
    "student",
    "/dashboard/student",
    "student"
  );
  return (
    <RoleDashboardShell session={s} basePath="/dashboard/student">
      {children}
    </RoleDashboardShell>
  );
}
