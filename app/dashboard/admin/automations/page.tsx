import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { EmailAutomationsPanel } from "@/components/dashboard/admin/email/email-automations-panel";

export const dynamic = "force-dynamic";

export default function AdminAutomationsPage() {
  return (
    <>
      <AdminPageHeader
        title="Automations"
        description="Trigger email and SMS sequences when things happen — donations, sign-ups, roles, campaigns, goals, calls, and form submissions."
      />
      <EmailAutomationsPanel />
    </>
  );
}
