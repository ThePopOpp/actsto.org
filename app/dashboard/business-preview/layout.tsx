import { notFound } from "next/navigation";

import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { isDashboardPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { PREVIEW_SESSION_BUSINESS } from "@/lib/dashboard/preview-sessions";

export default function BusinessPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isDashboardPreviewEnabled()) {
    notFound();
  }
  return (
    <RoleDashboardShell
      session={PREVIEW_SESSION_BUSINESS}
      basePath="/dashboard/business-preview"
      previewMode
    >
      {children}
    </RoleDashboardShell>
  );
}
