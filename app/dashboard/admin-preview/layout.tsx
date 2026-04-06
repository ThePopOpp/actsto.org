import { notFound } from "next/navigation";

import { AdminAppShell } from "@/components/dashboard/admin-app-shell";
import { isAdminUiPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import type { ActSession } from "@/lib/auth/types";

const PREVIEW_BASE = "/dashboard/admin-preview";

const previewUser: ActSession = {
  email: "preview@local.dev",
  name: "UI preview",
  role: "super_admin",
  roles: [],
};

export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminUiPreviewEnabled()) {
    notFound();
  }

  return (
    <AdminAppShell user={previewUser} basePath={PREVIEW_BASE} previewMode>
      {children}
    </AdminAppShell>
  );
}
