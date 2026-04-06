import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { requirePortalDashboardSession } from "@/lib/auth/session-guards";
import { getActSession } from "@/lib/auth/session-server";

export default async function DonorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = requirePortalDashboardSession(
    await getActSession(),
    "donor_individual",
    "/dashboard/donor",
    "donor_individual"
  );
  return (
    <RoleDashboardShell session={s} basePath="/dashboard/donor">
      {children}
    </RoleDashboardShell>
  );
}
