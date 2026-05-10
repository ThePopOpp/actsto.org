import { BackersDashboard } from "@/components/dashboard/backers-dashboard";
import { PREVIEW_SESSION_PARENT } from "@/lib/dashboard/preview-sessions";

export const dynamic = "force-dynamic";

export default function ParentPreviewBackersPage() {
  return <BackersDashboard session={PREVIEW_SESSION_PARENT} backHref="/dashboard/parent-preview" />;
}
