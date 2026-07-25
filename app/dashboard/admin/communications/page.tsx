import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Users } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { DialerPanel } from "@/components/dashboard/admin/sms/dialer-panel";
import { SmsComposePanel } from "@/components/dashboard/admin/sms/sms-compose-panel";
import { SmsInboxAccordion } from "@/components/dashboard/admin/sms/sms-inbox-accordion";
import { SocialComposer } from "@/components/dashboard/admin/social/social-composer";
import { Messenger } from "@/components/messaging/messenger";
import { Card, CardContent } from "@/components/ui/card";
import { getMessagingUser } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

type HubTab = "calls" | "messages" | "sms" | "social" | "email" | "contacts";

const tabs: AdminPageTabLink<HubTab>[] = [
  { id: "calls", label: "Calls" },
  { id: "sms", label: "SMS" },
  { id: "messages", label: "Messages" },
  { id: "social", label: "Social" },
  { id: "email", label: "Email" },
  { id: "contacts", label: "Contacts" },
];

function Launchpad({ href, title, description, Icon }: { href: string; title: string; description: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="group block">
      <Card className="border-border/80 transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-semibold text-primary">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AdminCommunicationsHubPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getMessagingUser();
  if (!me) redirect("/login?next=/dashboard/admin/communications");
  const { tab } = await searchParams;
  const active = (tabs.find((t) => t.id === tab)?.id ?? "calls") as HubTab;

  return (
    <>
      <AdminPageHeader title="Communications" description="Voice calls, SMS, direct messages, social, and email — one hub." />
      <div className="space-y-5">
        <AdminPageTabLinks tabs={tabs} activeTab={active} baseHref="/dashboard/admin/communications" />

        {active === "calls" && <DialerPanel />}

        {active === "sms" && (
          <div className="space-y-4">
            <SmsComposePanel />
            <SmsInboxAccordion />
          </div>
        )}

        {active === "messages" && <Messenger currentUserId={me.userId} />}

        {active === "social" && <SocialComposer />}

        {active === "email" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Launchpad href="/dashboard/admin/email?tab=send" title="Send email" description="Compose to a person or segment, with template picker." Icon={Mail} />
            <Launchpad href="/dashboard/admin/email?tab=templates" title="Templates" description="Browse the template library." Icon={Mail} />
            <Launchpad href="/dashboard/admin/email?tab=editor" title="Template editor" description="Build visual or HTML email templates." Icon={Mail} />
            <Launchpad href="/dashboard/admin/email?tab=inbox" title="Inbox" description="Read and reply to inbound email." Icon={Mail} />
          </div>
        )}

        {active === "contacts" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Launchpad href="/dashboard/admin/users" title="All users" description="Parents, students, donors, and admins." Icon={Users} />
            <Launchpad href="/dashboard/admin/backers" title="Donors" description="Everyone who has supported a campaign." Icon={Users} />
          </div>
        )}
      </div>
    </>
  );
}
