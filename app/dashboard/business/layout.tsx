import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { requirePortalDashboardSession } from "@/lib/auth/session-guards";
import { getActSession } from "@/lib/auth/session-server";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = requirePortalDashboardSession(
    await getActSession(),
    "donor_business",
    "/dashboard/business",
    "donor_business"
  );
  return (
    <RoleDashboardShell session={s} basePath="/dashboard/business">
      {children}
    </RoleDashboardShell>
  );
}
