import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Mail,
  Megaphone,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

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
  icon: typeof TrendingUp;
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
  icon: typeof Megaphone;
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

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-heading font-semibold text-primary tabular-nums">{value}</span>
    </div>
  );
}
