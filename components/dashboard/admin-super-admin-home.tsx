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
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function moneyExact(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function percent(raised: unknown, goal: unknown) {
  const raisedNumber = Number(raised ?? 0);
  const goalNumber = Number(goal ?? 0);
  if (!Number.isFinite(raisedNumber) || !Number.isFinite(goalNumber) || goalNumber <= 0) return 0;
  return Math.min(100, Math.round((raisedNumber / goalNumber) * 100));
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

function startOfYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  if (status.includes("refund")) return <Badge className="bg-amber-600 hover:bg-amber-600">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
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
      ? envReady("PAYPAL_LIVE_CLIENT_ID", "PAYPAL_LIVE_CLIENT_SECRET") ||
        envReady("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET")
      : envReady("PAYPAL_SANDBOX_CLIENT_ID", "PAYPAL_SANDBOX_CLIENT_SECRET") ||
        envReady("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET");

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
      ok: envReady("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN") &&
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
    recentPayments,
    topCampaigns,
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
    staleCampaigns,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { status: "paid", createdAt: { gte: yearStart } },
      _sum: { totalAmount: true, amount: true },
      _count: { _all: true },
    }),
    prisma.donation.aggregate({
      where: { status: "paid", createdAt: { gte: monthStart } },
      _sum: { totalAmount: true, amount: true },
      _count: { _all: true },
    }),
    prisma.campaign.count({ where: { status: "active", isPublic: true } }),
    prisma.campaign.count({ where: { status: "pending_review" } }),
    prisma.donation.findMany({
      where: { paymentProvider: "paypal" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        campaign: { select: { title: true, slug: true } },
        taxReceipts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.campaign.findMany({
      where: { status: "active", isPublic: true },
      orderBy: [{ raisedAmount: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        goalAmount: true,
        raisedAmount: true,
        donorCount: true,
        endsAt: true,
      },
    }),
    prisma.profile.count(),
    prisma.userRoleRecord.count({ where: { role: "parent", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "student", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "donor_individual", status: "active" } }),
    prisma.userRoleRecord.count({ where: { role: "donor_business", status: "active" } }),
    prisma.profile.count({ where: { isSuperAdmin: true } }),
    prisma.donation.count({
      where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } },
    }),
    prisma.emailThread.count({ where: { channel: "email", unread: true } }).catch(() => 0),
    prisma.paymentEvent.count({
      where: { provider: "paypal", processed: false, eventType: { contains: "FAILED" } },
    }),
    prisma.campaign.findMany({
      where: { status: "pending_review" },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      take: 5,
      select: { id: true, title: true, slug: true, submittedAt: true, createdAt: true },
    }),
    prisma.donation.findMany({
      where: { status: "paid", paymentProvider: "paypal", taxReceipts: { none: {} } },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { campaign: { select: { title: true } } },
    }),
    prisma.emailThread.findMany({
      where: { channel: "email", unread: true },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      select: { id: true, subject: true, fromName: true, fromEmail: true, lastMessageAt: true, flagged: true },
    }).catch(() => []),
    prisma.paymentEvent.findMany({
      where: { provider: "paypal", processed: false, eventType: { contains: "FAILED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, eventType: true, providerOrderId: true, createdAt: true },
    }),
    prisma.accountSetupProgress.findMany({
      where: { completionPercent: { lt: 100 } },
      orderBy: [{ completionPercent: "asc" }, { updatedAt: "desc" }],
      take: 5,
      include: { profile: { select: { email: true, displayName: true, fullName: true } } },
    }).catch(() => []),
    prisma.campaign.findMany({
      where: {
        status: "active",
        isPublic: true,
        updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: { id: true, title: true, slug: true, updatedAt: true, raisedAmount: true, goalAmount: true },
    }),
  ]);

  const yearTotal = yearDonations._sum.totalAmount ?? yearDonations._sum.amount ?? 0;
  const monthTotal = monthDonations._sum.totalAmount ?? monthDonations._sum.amount ?? 0;

  return {
    yearTotal,
    monthTotal,
    yearDonationCount: yearDonations._count._all,
    monthDonationCount: monthDonations._count._all,
    activeCampaigns,
    pendingCampaigns,
    recentPayments,
    topCampaigns,
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
    staleCampaigns,
    systemHealth: getSystemHealth(),
  };
}

export async function AdminSuperAdminHome({ basePath }: AdminSuperAdminHomeProps) {
  const data = await getOverviewData();
  const exceptionCount = data.pendingCampaigns + data.missingReceiptCount + data.unreadInboxCount + data.failedPaymentEvents;

  const quickActions = [
    { label: "Create Campaign", href: "/dashboard/admin/campaigns" },
    { label: "Create User", href: "/dashboard/admin/users" },
    { label: "View Payments", href: "/dashboard/admin/billing" },
    { label: "Inbox", href: "/dashboard/admin/messages" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-act-red uppercase">Super Admin</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">
            Command center
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Live operational snapshot for donations, campaigns, users, receipts, and inbox activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={adminHrefForBase(action.href, basePath)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="Donations this year"
          value={money(data.yearTotal)}
          detail={`${data.yearDonationCount} paid donation${data.yearDonationCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          icon={CreditCard}
          label="Donations this month"
          value={money(data.monthTotal)}
          detail={`${data.monthDonationCount} paid donation${data.monthDonationCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          icon={Megaphone}
          label="Active campaigns"
          value={String(data.activeCampaigns)}
          detail={`${data.pendingCampaigns} pending review`}
        />
        <MetricCard
          icon={Users}
          label="Total profiles"
          value={String(data.profileCount)}
          detail="Supabase-backed app profiles"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SignalCard
          href="/dashboard/admin/campaigns"
          basePath={basePath}
          icon={Megaphone}
          label="Pending campaigns"
          value={data.pendingCampaigns}
        />
        <SignalCard
          href="/dashboard/admin/billing"
          basePath={basePath}
          icon={Receipt}
          label="Missing receipts"
          value={data.missingReceiptCount}
        />
        <SignalCard
          href="/dashboard/admin/messages"
          basePath={basePath}
          icon={Mail}
          label="Unread inbox"
          value={data.unreadInboxCount}
        />
        <SignalCard
          href="/dashboard/admin/billing"
          basePath={basePath}
          icon={AlertCircle}
          label="Failed payment events"
          value={data.failedPaymentEvents}
        />
      </div>

      {exceptionCount > 0 ? (
        <Card className="border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-primary">Needs attention</CardTitle>
            <CardDescription>
              {exceptionCount} item{exceptionCount === 1 ? "" : "s"} across approvals, receipts, inbox, or payment events.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <ActionQueueCard
          title="Approval queue"
          description="Campaigns waiting for Super Admin review."
          empty="No campaigns waiting for approval."
          href="/dashboard/admin/campaigns"
          basePath={basePath}
          items={data.pendingCampaignList.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            meta: `Submitted ${dt(campaign.submittedAt ?? campaign.createdAt)}`,
          }))}
        />
        <ActionQueueCard
          title="Receipt gaps"
          description="Paid donations missing generated tax receipts."
          empty="All paid PayPal donations have receipts."
          href="/dashboard/admin/billing"
          basePath={basePath}
          items={data.missingReceiptDonations.map((donation) => ({
            id: donation.id,
            title: `${moneyExact(donation.totalAmount ?? donation.amount)} ${donation.campaign?.title ?? "General fund"}`,
            meta: `Paid ${dt(donation.createdAt)}`,
          }))}
        />
        <ActionQueueCard
          title="Unread inbox"
          description="Email threads needing a response or review."
          empty="No unread email threads."
          href="/dashboard/admin/messages"
          basePath={basePath}
          items={data.unreadThreads.map((thread) => ({
            id: thread.id,
            title: thread.subject || "No subject",
            meta: `${thread.fromName || thread.fromEmail || "Unknown sender"} · ${dt(thread.lastMessageAt)}`,
            badge: thread.flagged ? "Flagged" : undefined,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActionQueueCard
          title="Payment exceptions"
          description="Failed unprocessed PayPal events."
          empty="No failed PayPal events."
          href="/dashboard/admin/billing"
          basePath={basePath}
          items={data.failedEvents.map((event) => ({
            id: event.id,
            title: event.eventType,
            meta: `Order ${event.providerOrderId ?? "-"} · ${dt(event.createdAt)}`,
          }))}
        />
        <ActionQueueCard
          title="Profile completion"
          description="Accounts that still need required fields."
          empty="No incomplete profile records found."
          href="/dashboard/admin/users"
          basePath={basePath}
          items={data.incompleteProfiles.map((progress) => ({
            id: progress.id,
            title: progress.profile.displayName || progress.profile.fullName || progress.profile.email,
            meta: `${progress.role.replace("_", " ")} · ${progress.completionPercent}% complete`,
          }))}
        />
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-primary">System health</CardTitle>
              <CardDescription>Environment-backed integration readiness for the admin workflows.</CardDescription>
            </div>
            <ShieldCheck className="size-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {data.systemHealth.map((item) => (
            <Link
              key={item.label}
              href={adminHrefForBase(item.href, basePath)}
              className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-full items-start gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    item.ok ? "bg-emerald-600/10 text-emerald-700" : "bg-act-red/10 text-act-red"
                  )}
                >
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-primary">{item.label}</p>
                    {item.ok ? (
                      <CheckCircle2 className="size-3.5 text-emerald-700" />
                    ) : (
                      <XCircle className="size-3.5 text-act-red" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {data.staleCampaigns.length > 0 ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Campaign follow-up</CardTitle>
            <CardDescription>Active public campaigns without recent updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {data.staleCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">{campaign.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      Updated {dt(campaign.updatedAt)} · {percent(campaign.raisedAmount, campaign.goalAmount)}% funded
                    </p>
                  </div>
                  <Link
                    href={adminHrefForBase("/dashboard/admin/campaigns", basePath)}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-primary">Recent payments</CardTitle>
                <CardDescription>Latest PayPal donation records and receipt status.</CardDescription>
              </div>
              <Link
                href={adminHrefForBase("/dashboard/admin/billing", basePath)}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Payments <ArrowRight className="ml-1 size-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {data.recentPayments.length > 0 ? (
                  data.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 pr-4 text-muted-foreground">{dt(payment.createdAt)}</td>
                      <td className="py-3 pr-4">{statusBadge(payment.status)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {moneyExact(payment.totalAmount ?? payment.amount)}
                      </td>
                      <td className="py-3 pr-4">{payment.campaign?.title ?? "General fund"}</td>
                      <td className="py-3 font-mono text-xs">
                        {payment.taxReceipts[0]?.receiptNumber ?? "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No PayPal donations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-primary">User counts</CardTitle>
                <CardDescription>Active role records and Super Admin profiles.</CardDescription>
              </div>
              <Link
                href={adminHrefForBase("/dashboard/admin/users", basePath)}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Users <ArrowRight className="ml-1 size-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CountRow label="Parents" value={data.roleCounts.parents} />
            <CountRow label="Students" value={data.roleCounts.students} />
            <CountRow label="Individual donors" value={data.roleCounts.individualDonors} />
            <CountRow label="Business donors" value={data.roleCounts.businessDonors} />
            <CountRow label="Super Admins" value={data.roleCounts.superAdmins} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-primary">Active campaign progress</CardTitle>
              <CardDescription>Top active public campaigns by raised amount.</CardDescription>
            </div>
            <Link
              href={adminHrefForBase("/dashboard/admin/campaigns", basePath)}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Campaigns <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {data.topCampaigns.length > 0 ? (
            data.topCampaigns.map((campaign) => {
              const campaignPercent = percent(campaign.raisedAmount, campaign.goalAmount);
              return (
                <div key={campaign.id} className="rounded-lg border border-border/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-heading font-semibold text-primary">{campaign.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {moneyExact(campaign.raisedAmount)} raised of {moneyExact(campaign.goalAmount)}
                      </p>
                    </div>
                    <Badge variant="secondary">{campaignPercent}%</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-act-red"
                      style={{ width: `${campaignPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>{campaign.donorCount} donor{campaign.donorCount === 1 ? "" : "s"}</span>
                    <span>Ends {dt(campaign.endsAt)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No active public campaigns yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="font-heading text-2xl text-primary">{value}</CardTitle>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardHeader>
    </Card>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
  href,
  basePath,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  basePath: string;
}) {
  return (
    <Link href={adminHrefForBase(href, basePath)} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full border-border/80 transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn("flex size-10 items-center justify-center rounded-lg", value > 0 ? "bg-act-red/10 text-act-red" : "bg-emerald-600/10 text-emerald-700")}>
            <Icon className="size-5" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-heading text-2xl font-semibold text-primary">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionQueueCard({
  title,
  description,
  empty,
  items,
  href,
  basePath,
}: {
  title: string;
  description: string;
  empty: string;
  items: { id: string; title: string; meta: string; badge?: string }[];
  href: string;
  basePath: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link
            href={adminHrefForBase(href, basePath)}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
          >
            Open <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/70 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                </div>
                {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-heading font-semibold text-primary tabular-nums">{value}</span>
    </div>
  );
}
