import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { EmailAutomationsPanel } from "@/components/dashboard/admin/email/email-automations-panel";
import { EmailComposePanel } from "@/components/dashboard/admin/email/email-compose-panel";
import { EmailFormSubmissions } from "@/components/dashboard/admin/email/email-form-submissions";
import { EmailHistory } from "@/components/dashboard/admin/email/email-history";
import { EmailInboxAccordion } from "@/components/dashboard/admin/email/email-inbox-accordion";
import { EmailStats } from "@/components/dashboard/admin/email/email-stats";
import { EmailTemplateEditor } from "@/components/dashboard/admin/email/email-template-editor";
import { EmailTemplatesLibrary } from "@/components/dashboard/admin/email/email-templates-library";
import { EmailWizard } from "@/components/dashboard/admin/email/email-wizard";

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

export default async function AdminEmailPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const { tab, id } = await searchParams;
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
        {active === "templates" && <EmailTemplatesLibrary />}
        {active === "editor" && <EmailTemplateEditor editId={id} />}
        {active === "automations" && <EmailAutomationsPanel />}
        {active === "inbox" && <EmailInboxAccordion />}
        {active === "forms" && <EmailFormSubmissions />}
        {active === "history" && <EmailHistory />}
        {active === "wizard" && <EmailWizard />}
      </div>
    </>
  );
}
