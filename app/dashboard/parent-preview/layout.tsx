import { notFound } from "next/navigation";

import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { isDashboardPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { PREVIEW_SESSION_PARENT } from "@/lib/dashboard/preview-sessions";

export default function ParentPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isDashboardPreviewEnabled()) {
    notFound();
  }
  return (
    <RoleDashboardShell
      session={PREVIEW_SESSION_PARENT}
      basePath="/dashboard/parent-preview"
      previewMode
    >
      {children}
    </RoleDashboardShell>
  );
}
