import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { requirePortalDashboardSession } from "@/lib/auth/session-guards";
import { getActSession } from "@/lib/auth/session-server";

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = requirePortalDashboardSession(
    await getActSession(),
    "parent",
    "/dashboard/parent",
    "parent"
  );
  return (
    <RoleDashboardShell session={s} basePath="/dashboard/parent">
      {children}
    </RoleDashboardShell>
  );
}
