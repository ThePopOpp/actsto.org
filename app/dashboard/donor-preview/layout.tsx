import { notFound } from "next/navigation";

import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { isDashboardPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { PREVIEW_SESSION_DONOR } from "@/lib/dashboard/preview-sessions";

export default function DonorPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isDashboardPreviewEnabled()) {
    notFound();
  }
  return (
    <RoleDashboardShell
      session={PREVIEW_SESSION_DONOR}
      basePath="/dashboard/donor-preview"
      previewMode
    >
      {children}
    </RoleDashboardShell>
  );
}
