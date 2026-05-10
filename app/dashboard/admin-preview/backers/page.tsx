import { BackersDashboard } from "@/components/dashboard/backers-dashboard";
import type { ActSession } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

const previewUser: ActSession = {
  email: "preview@local.dev",
  name: "UI preview",
  role: "super_admin",
  roles: [],
};

export default function AdminPreviewBackersPage() {
  return <BackersDashboard session={previewUser} backHref="/dashboard/admin-preview" />;
}
