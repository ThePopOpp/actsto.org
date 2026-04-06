import Link from "next/link";
import { ExternalLink, LayoutGrid } from "lucide-react";

import { AdminOverviewGrid } from "@/components/dashboard/admin-overview-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDashboardPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { buttonVariants } from "@/lib/button-variants";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import { cn } from "@/lib/utils";

type ModuleRef = {
  title: string;
  href: string;
  summary: string;
  capabilities: string[];
};

const MODULE_REFERENCE: ModuleRef[] = [
  {
    title: "Campaigns",
    href: "/dashboard/admin/campaigns",
    summary: "Moderation, progress, and sample data for review.",
    capabilities: [
      "List & grid views with mock campaigns",
      "Status badges: pending, approved, featured, rejected",
      "Link-through to public campaign pages",
    ],
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    summary: "Directory-style exploration with role and status context.",
    capabilities: [
      "List & grid views",
      "Sample parents, students, individual & business donors",
      "Active / invited / suspended states",
    ],
  },
  {
    title: "API & credentials",
    href: "/dashboard/admin/credentials",
    summary: "Integration secrets (UI only until wired to vault).",
    capabilities: [
      "FluentCRM REST (base URL, user, app password)",
      "Resend + SMTP fallback + TLS",
      "Webhook HMAC + internal cron token",
      "Maps + reCAPTCHA keys",
    ],
  },
  {
    title: "Notifications",
    href: "/dashboard/admin/notifications",
    summary: "Channels, triggers, admin alerts, throttles, audit log.",
    capabilities: [
      "Email / SMS / future push toggles & sender identity",
      "Receipts, approvals, milestones, tax reminders",
      "Donation threshold alerts, SLA nudges",
      "Rate limits & quiet hours · sample send audit table",
    ],
  },
  {
    title: "Billing · PayPal",
    href: "/dashboard/admin/billing",
    summary: "Merchant REST credentials for sandbox and production.",
    capabilities: ["Sandbox & live client ID + secrets", "Webhook ID", "Masked fields with reveal"],
  },
  {
    title: "SMS · Twilio",
    href: "/dashboard/admin/sms",
    summary: "Twilio Console credentials.",
    capabilities: ["Account SID & auth token", "Optional messaging service SID"],
  },
  {
    title: "Inbox",
    href: "/dashboard/admin/messages",
    summary: "Inbound review + segmented compose.",
    capabilities: [
      "Filters: unread, flagged, email, SMS, campaign-linked",
      "Master–detail reader with flag & mailto reply",
      "Compose: individual picker or multi-segment broadcast",
      "Template starters & merge-tag hints",
    ],
  },
  {
    title: "Invoices",
    href: "/dashboard/admin/invoices",
    summary: "PDF sample invoices via PDFx-style + @react-pdf/renderer.",
    capabilities: ["Full invoice form: line items, tax %, bill-to", "Download PDF · reset sample"],
  },
  {
    title: "Legal",
    href: "/dashboard/admin/legal",
    summary: "Terms, privacy, and communication policy with rich-text editor.",
    capabilities: [
      "WYSIWYG (TipTap) per document",
      "Saved HTML served on /legal/* public routes",
      "Reset to built-in defaults generated from policy components",
    ],
  },
  {
    title: "Site & content",
    href: "/dashboard/admin/cms",
    summary: "Marketing copy blocks without touching code.",
    capabilities: [
      "Announcement banner + tone",
      "Homepage hero & CTAs",
      "SEO defaults, legal paths, footer, resources, featured nav item",
    ],
  },
  {
    title: "Settings",
    href: "/dashboard/admin/settings",
    summary: "Org-wide switches and compliance display.",
    capabilities: [
      "Branding & contact info",
      "Tax year & disclaimer",
      "Campaign defaults & approval gate",
      "Domains, analytics, feature flags",
      "Danger zone (export / erasure demos)",
    ],
  },
];

const ROLE_PREVIEWS = [
  { href: "/dashboard/parent-preview", label: "Parent" },
  { href: "/dashboard/student-preview", label: "Student" },
  { href: "/dashboard/donor-preview", label: "Individual donor" },
  { href: "/dashboard/business-preview", label: "Business donor" },
] as const;

export function AdminSuperAdminHome({ basePath }: { basePath: string }) {
  const previews = isDashboardPreviewEnabled();

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-wide text-act-red uppercase">Super Admin</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">
          Control center
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Everything below is on the <strong className="font-medium text-foreground">authenticated</strong>{" "}
          Super Admin routes under{" "}
          <code className="rounded bg-muted px-1 text-xs">/dashboard/admin</code>. Open any tile, then use
          the module reference to confirm form fields and flows.
        </p>
      </div>

      <AdminOverviewGrid basePath={basePath} />

      {previews ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-primary">
              <LayoutGrid className="size-5" />
              Role dashboard previews
            </CardTitle>
            <CardDescription>
              Unauthenticated UI review (same rules as admin preview: development, or{" "}
              <code className="rounded bg-background px-1 text-xs">ADMIN_UI_PREVIEW=true</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ROLE_PREVIEWS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-primary/30 bg-background"
                )}
              >
                <ExternalLink className="mr-1.5 size-3.5 opacity-70" />
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="module-ref-heading">
        <h2 id="module-ref-heading" className="font-heading text-xl font-semibold text-primary">
          Module reference — fields &amp; capabilities
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Checklist of what each area contains today. Links respect the current admin base path.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {MODULE_REFERENCE.map((m) => (
            <Card key={m.href} className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="font-heading text-lg text-primary">{m.title}</CardTitle>
                  <Link
                    href={adminHrefForBase(m.href, basePath)}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 -mr-2")}
                  >
                    Open
                  </Link>
                </div>
                <CardDescription>{m.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {m.capabilities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
