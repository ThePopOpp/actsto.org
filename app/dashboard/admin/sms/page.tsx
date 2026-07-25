import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { AdminTwilioSettingsForm } from "@/components/dashboard/admin/admin-twilio-settings-form";
import { DialerPanel } from "@/components/dashboard/admin/sms/dialer-panel";
import { SmsComposePanel } from "@/components/dashboard/admin/sms/sms-compose-panel";
import { SmsInboxAccordion } from "@/components/dashboard/admin/sms/sms-inbox-accordion";
import { SmsTemplatesPanel } from "@/components/dashboard/admin/sms/sms-templates-panel";

export const dynamic = "force-dynamic";

type SmsTab = "inbox" | "send" | "dialer" | "templates" | "credentials";

const tabs: AdminPageTabLink<SmsTab>[] = [
  { id: "inbox", label: "Inbox" },
  { id: "send", label: "Send SMS" },
  { id: "dialer", label: "Dialer" },
  { id: "templates", label: "Templates" },
  { id: "credentials", label: "Credentials" },
];

export default async function AdminSmsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = (tabs.find((t) => t.id === tab)?.id ?? "inbox") as SmsTab;

  return (
    <>
      <AdminPageHeader
        title="Communications"
        description="SMS conversations, one-to-one and bulk sends, click-to-call dialer, templates, and Twilio credentials."
      />
      <div className="space-y-5">
        <AdminPageTabLinks tabs={tabs} activeTab={active} baseHref="/dashboard/admin/sms" />
        {active === "inbox" && <SmsInboxAccordion />}
        {active === "send" && <SmsComposePanel />}
        {active === "dialer" && <DialerPanel />}
        {active === "templates" && <SmsTemplatesPanel />}
        {active === "credentials" && <AdminTwilioSettingsForm />}
      </div>
    </>
  );
}
