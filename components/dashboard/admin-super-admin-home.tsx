import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Mail,
  Megaphone,
  MessageSquare,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type AdminSuperAdminHomeProps = {
  basePath: string;
};

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function moneyExact(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function startOfYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}
function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function envReady(...keys: string[]) {
  return keys.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function getSystemHealth() {
  const paypalMode = process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";
  const paypalClientReady =
    paypalMode === "live"
      ? envReady("PAYPAL_LIVE_CLIENT_ID", "PAYPAL_LIVE_CLIENT_SECRET") || envReady("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET")
      : envReady("PAYPAL_SANDBOX_CLIENT_ID", "PAYPAL_SANDBOX_CLIENT_SECRET") || envReady("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET");

  return [
    {
      label: "Supabase",
      detail: "Auth + database",
      ok: envReady("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
      icon: Database,
      href: "/dashboard/admin/users",
    },
    {
      label: "PayPal",
      detail: `${paypalMode} mode${process.env.PAYPAL_WEBHOOK_ID ? " + webhook" : ""}`,
      ok: paypalClientReady && envReady("PAYPAL_WEBHOOK_ID"),
      icon: CreditCard,
      href: "/dashboard/admin/billing",
    },
    {
      label: "SMTP",
      detail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "Outbound email",
      ok: envReady("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"),
      icon: Mail,
      href: "/dashboard/admin/messages",
    },
    {
      label: "IMAP",
      detail: process.env.IMAP_USER || "Inbox sync",
      ok: envReady("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"),
      icon: Mail,
      href: "/dashboard/admin/messages",
    },
    {
      label: "Twilio",
      detail: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID || "SMS",
      ok:
        envReady("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN") &&
        (envReady("TWILIO_PHONE_NUMBER") || envReady("TWILIO_MESSAGING_SERVICE_SID")),
      icon: MessageSquare,
      href: "/dashboard/admin/sms",
    },
  ];
}

async function getOverviewData() {
  const yearStart = startOfYear();
  const monthStart = startOfMonth();

  const [
    yearDonations,
    monthDonations,
    activeCampaigns,
    pendingCampaigns,
    profileCount,
    parentCount,
    studentCount,
    individualDonorCount,
    businessDonorCount,
    superAdminCount,
    missingReceiptCount,
    unreadInboxCount,
    failedPaymentEvents,
    pendingCampaignList,
    missingReceiptDonations,
    unreadThreads,
    failedEvents,
    incompleteProfiles,
  ] = await Promise.all([
    prisma.donation.aggregate({ where: { status: "paid", createdAt: { gte: yearStart } }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
    prisma.donation.aggregate({ where: { status: "paid", createdAt: { gte: monthStart } }, _sum: { totalAmount: true, amount: true }, _count: { _all: true } }),
    prisma.campaign.count({ where: { status: "active", isPublic: true } }),
    prisma.campaign.count({ where: { status: "pending_review" } }),
    prisma.profile.count(),
    prisma.userRoleRecord.count({ where: { role: "parent", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "student", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "donor_individual", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "donor_business", status: "active" } }),
    prisma.profile.count({ where: { isSuperAdmin: true } }),
    prisma.donation.count({ where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } } }),
    prisma.emailThread.count({ where: { channel: "email", unread: true } }).catch(() => 0),
    prisma.paymentEvent.count({ where: { provider: "paypal", processed: false, eventType: { contains: "FAILED" } } }),
    prisma.campaign.findMany({ where: { status: "pending_review" }, orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }], take: 3, select: { id: true, title: true, submittedAt: true, createdAt: true } }),
    prisma.donation.findMany({ where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } }, orderBy: { createdAt: "asc" }, take: 3, include: { campaign: { select: { title: true } } } }),
    prisma.emailThread.findMany({ where: { channel: "email", unread: true }, orderBy: { lastMessageAt: "desc" }, take: 3, select: { id: true, subject: true, fromName: true, fromEmail: true, lastMessageAt: true, flagged: true } }).catch(() => []),
    prisma.paymentEvent.findMany({ where: { provider: "paypal", processed: false, eventType: { contains: "FAILED" } }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, eventType: true, providerOrderId: true, createdAt: true } }),
    prisma.accountSetupProgress.findMany({ where: { completionPercent: { lt: 100 } }, orderBy: [{ completionPercent: "asc" }, { updatedAt: "desc" }], take: 3, include: { profile: { select: { email: true, displayName: true, fullName: true } } } }).catch(() => []),
  ]);

  return {
    yearTotal: yearDonations._sum.totalAmount ?? yearDonations._sum.amount ?? 0,
    monthTotal: monthDonations._sum.totalAmount ?? monthDonations._sum.amount ?? 0,
    yearDonationCount: yearDonations._count._all,
    monthDonationCount: monthDonations._count._all,
    activeCampaigns,
    pendingCampaigns,
    profileCount,
    roleCounts: {
      parents: parentCount,
      students: studentCount,
      individualDonors: individualDonorCount,
      businessDonors: businessDonorCount,
      superAdmins: superAdminCount,
    },
    missingReceiptCount,
    unreadInboxCount,
    failedPaymentEvents,
    pendingCampaignList,
    missingReceiptDonations,
    unreadThreads,
    failedEvents,
    incompleteProfiles,
    systemHealth: getSystemHealth(),
  };
}

export async function AdminSuperAdminHome({ basePath }: AdminSuperAdminHomeProps) {
  const data = await getOverviewData();

  const quickActions = [
    { label: "Create Campaign", href: "/dashboard/admin/campaigns" },
    { label: "Create User", href: "/dashboard/admin/users" },
    { label: "Accounting", href: "/dashboard/admin/accounting" },
    { label: "Inbox", href: "/dashboard/admin/messages" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-act-red uppercase">Super Admin</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-primary sm:text-3xl">Command center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live snapshot of donations, campaigns, users, receipts, and inbox activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={adminHrefForBase(action.href, basePath)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Dense, all-linked stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatTile basePath={basePath} href="/dashboard/admin/accounting" icon={TrendingUp} label="Donations YTD" value={money(data.yearTotal)} sub={`${data.yearDonationCount} paid`} />
        <StatTile basePath={basePath} href="/dashboard/admin/accounting" icon={CreditCard} label="This month" value={money(data.monthTotal)} sub={`${data.monthDonationCount} paid`} />
        <StatTile basePath={basePath} href="/dashboard/admin/campaigns" icon={Megaphone} label="Active campaigns" value={String(data.activeCampaigns)} sub="Public & live" />
        <StatTile basePath={basePath} href="/dashboard/admin/users" icon={Users} label="Total profiles" value={String(data.profileCount)} sub="App accounts" />
        <StatTile basePath={basePath} href="/dashboard/admin/campaigns" icon={Megaphone} label="Pending review" value={data.pendingCampaigns} alert={data.pendingCampaigns > 0} sub="Campaigns" />
        <StatTile basePath={basePath} href="/dashboard/admin/receipts" icon={Receipt} label="Missing receipts" value={data.missingReceiptCount} alert={data.missingReceiptCount > 0} sub="Paid donations" />
        <StatTile basePath={basePath} href="/dashboard/admin/messages" icon={Mail} label="Unread inbox" value={data.unreadInboxCount} alert={data.unreadInboxCount > 0} sub="Email threads" />
        <StatTile basePath={basePath} href="/dashboard/admin/billing" icon={AlertCircle} label="Failed events" value={data.failedPaymentEvents} alert={data.failedPaymentEvents > 0} sub="PayPal" />
      </div>

      {/* Attention queues — capped to 3 items each */}
      <div className="grid gap-4 xl:grid-cols-3">
        <QueueCard
          title="Approval queue"
          href="/dashboard/admin/campaigns"
          basePath={basePath}
          empty="No campaigns waiting."
          items={data.pendingCampaignList.map((c) => ({ id: c.id, title: c.title, meta: `Submitted ${dt(c.submittedAt ?? c.createdAt)}` }))}
        />
        <QueueCard
          title="Receipt gaps"
          href="/dashboard/admin/receipts"
          basePath={basePath}
          empty="All paid donations have receipts."
          items={data.missingReceiptDonations.map((d) => ({ id: d.id, title: `${moneyExact(d.totalAmount ?? d.amount)} · ${d.campaign?.title ?? "General fund"}`, meta: `Paid ${dt(d.createdAt)}` }))}
        />
        <QueueCard
          title="Unread inbox"
          href="/dashboard/admin/messages"
          basePath={basePath}
          empty="No unread threads."
          items={data.unreadThreads.map((t) => ({ id: t.id, title: t.subject || "No subject", meta: `${t.fromName || t.fromEmail || "Unknown"} · ${dt(t.lastMessageAt)}`, badge: t.flagged ? "Flagged" : undefined }))}
        />
      </div>

      {/* Ops row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <QueueCard
          title="Payment exceptions"
          href="/dashboard/admin/billing"
          basePath={basePath}
          empty="No failed PayPal events."
          items={data.failedEvents.map((e) => ({ id: e.id, title: e.eventType, meta: `Order ${e.providerOrderId ?? "-"} · ${dt(e.createdAt)}` }))}
        />
        <QueueCard
          title="Profile completion"
          href="/dashboard/admin/users"
          basePath={basePath}
          empty="All profiles complete."
          items={data.incompleteProfiles.map((p) => ({ id: p.id, title: p.profile.displayName || p.profile.fullName || p.profile.email, meta: `${p.role.replace("_", " ")} · ${p.completionPercent}%` }))}
        />
        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <UserCheck className="size-4" /> User counts
              </p>
              <Link href={adminHrefForBase("/dashboard/admin/users", basePath)} className="text-xs text-muted-foreground hover:text-foreground">
                Users →
              </Link>
            </div>
            <div className="space-y-1.5">
              <CountRow label="Parents" value={data.roleCounts.parents} />
              <CountRow label="Students" value={data.roleCounts.students} />
              <CountRow label="Individual donors" value={data.roleCounts.individualDonors} />
              <CountRow label="Business donors" value={data.roleCounts.businessDonors} />
              <CountRow label="Super Admins" value={data.roleCounts.superAdmins} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System health strip */}
      <Card className="border-border/80">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4" /> System health
            </p>
            <span className="text-xs text-muted-foreground">Integration readiness</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {data.systemHealth.map((item) => (
              <Link key={item.label} href={adminHrefForBase(item.href, basePath)} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex h-full items-center gap-2.5 rounded-lg border border-border/70 p-2.5 transition-colors hover:bg-muted/40">
                  <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", item.ok ? "bg-emerald-600/10 text-emerald-700" : "bg-act-red/10 text-act-red")}>
                    <item.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-primary">{item.label}</p>
                      {item.ok ? <CheckCircle2 className="size-3 text-emerald-700" /> : <XCircle className="size-3 text-act-red" />}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  href,
  basePath,
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  href: string;
  basePath: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Link href={adminHrefForBase(href, basePath)} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card size="sm" className="h-full p-3 transition-shadow group-hover:shadow-md">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <Icon className={cn("size-3.5 shrink-0", alert ? "text-act-red" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums sm:text-2xl", alert ? "text-act-red" : "text-primary")}>{value}</p>
          {sub ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function QueueCard({
  title,
  href,
  basePath,
  empty,
  items,
}: {
  title: string;
  href: string;
  basePath: string;
  empty: string;
  items: { id: string; title: string; meta: string; badge?: string }[];
}) {
  return (
    <Card className="border-border/80">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <Link href={adminHrefForBase(href, basePath)} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            Open <ArrowRight className="ml-0.5 size-3.5" />
          </Link>
        </div>
        {items.length > 0 ? (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">{item.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.meta}</p>
                  </div>
                  {item.badge ? <Badge variant="outline" className="shrink-0 text-[10px]">{item.badge}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-heading font-semibold text-primary tabular-nums">{value}</span>
    </div>
  );
}
