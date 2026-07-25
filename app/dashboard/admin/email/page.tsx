import { AdminInboxWorkspace } from "@/components/dashboard/admin/admin-inbox-workspace";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { EmailAutomationsPanel } from "@/components/dashboard/admin/email/email-automations-panel";
import { EmailComposePanel } from "@/components/dashboard/admin/email/email-compose-panel";
import { EmailFormSubmissions } from "@/components/dashboard/admin/email/email-form-submissions";
import { EmailHistory } from "@/components/dashboard/admin/email/email-history";
import { EmailStats } from "@/components/dashboard/admin/email/email-stats";
import { EmailTemplateEditorPanel } from "@/components/dashboard/admin/email/email-template-editor-panel";
import { EmailWizard } from "@/components/dashboard/admin/email/email-wizard";
import { EmailTemplatesPanel } from "@/components/dashboard/admin/email-templates-panel";

export const dynamic = "force-dynamic";

type EmailTab = "stats" | "send" | "templates" | "editor" | "automations" | "inbox" | "forms" | "history" | "wizard";

const tabs: AdminPageTabLink<EmailTab>[] = [
  { id: "stats", label: "Stats" },
  { id: "send", label: "Send Email" },
  { id: "templates", label: "Templates" },
  { id: "editor", label: "Template Editor" },
  { id: "automations", label: "Automations" },
  { id: "inbox", label: "Inbox" },
  { id: "forms", label: "Form Submissions" },
  { id: "history", label: "History" },
  { id: "wizard", label: "Wizard" },
];

export default async function AdminEmailPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = (tabs.find((t) => t.id === tab)?.id ?? "stats") as EmailTab;

  return (
    <>
      <AdminPageHeader
        title="Email"
        description="Send, template, automate, and review email. Sending runs on Resend (falls back to SMTP); the inbox syncs over IMAP."
      />
      <div className="space-y-5">
        <AdminPageTabLinks tabs={tabs} activeTab={active} baseHref="/dashboard/admin/email" />
        {active === "stats" && <EmailStats />}
        {active === "send" && <EmailComposePanel />}
        {active === "templates" && <EmailTemplatesPanel />}
        {active === "editor" && <EmailTemplateEditorPanel />}
        {active === "automations" && <EmailAutomationsPanel />}
        {active === "inbox" && <AdminInboxWorkspace />}
        {active === "forms" && <EmailFormSubmissions />}
        {active === "history" && <EmailHistory />}
        {active === "wizard" && <EmailWizard />}
      </div>
    </>
  );
}
