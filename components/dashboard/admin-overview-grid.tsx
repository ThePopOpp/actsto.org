import Link from "next/link";
import {
  Bell,
  CreditCard,
  FileText,
  KeyRound,
  Mail,
  Megaphone,
  MessageSquare,
  Receipt,
  Scale,
  Settings,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import { cn } from "@/lib/utils";

const tiles = [
  {
    href: "/dashboard/admin/campaigns",
    title: "Campaigns",
    desc: "Create, approve, feature, suspend",
    icon: Megaphone,
  },
  {
    href: "/dashboard/admin/users",
    title: "Users",
    desc: "Parents, students, donors, businesses",
    icon: Users,
  },
  {
    href: "/dashboard/admin/credentials",
    title: "API & credentials",
    desc: "Keys, webhooks, secrets vault",
    icon: KeyRound,
  },
  {
    href: "/dashboard/admin/notifications",
    title: "Notifications",
    desc: "Email, SMS, push broadcasts",
    icon: Bell,
  },
  {
    href: "/dashboard/admin/billing",
    title: "Billing · PayPal",
    desc: "Payouts, transactions, receipts",
    icon: CreditCard,
  },
  {
    href: "/dashboard/admin/sms",
    title: "SMS · Twilio",
    desc: "Numbers, templates, delivery logs",
    icon: MessageSquare,
  },
  {
    href: "/dashboard/admin/messages",
    title: "Inbox",
    desc: "Inbound supporter & donor mail",
    icon: Mail,
  },
  {
    href: "/dashboard/admin/invoices",
    title: "Invoices",
    desc: "Corporate & custom billing",
    icon: Receipt,
  },
  {
    href: "/dashboard/admin/legal",
    title: "Legal",
    desc: "Terms, privacy, communication policy (WYSIWYG)",
    icon: Scale,
  },
  {
    href: "/dashboard/admin/cms",
    title: "Site & content",
    desc: "Pages, legal, homepage blocks",
    icon: FileText,
  },
  {
    href: "/dashboard/admin/settings",
    title: "Settings",
    desc: "Feature flags, domains, integrations",
    icon: Settings,
  },
] as const;

export function AdminOverviewGrid({ basePath }: { basePath: string }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Central control for campaigns, users, integrations, and communications. Sections below are
          wired for UI; connect your APIs and database next.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ href, title, desc, icon: Icon }) => (
          <Card key={href} className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="font-heading text-lg text-primary">{title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href={adminHrefForBase(href, basePath)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
