import Link from "next/link";
import { ArrowLeft, ExternalLink, Heart, MessageSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActSession } from "@/lib/auth/types";
import { buttonVariants } from "@/lib/button-variants";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function backerStatusBadge(status: string) {
  if (status === "visible") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Visible</Badge>;
  if (status === "pending_review") return <Badge variant="secondary">Pending review</Badge>;
  if (status === "hidden") return <Badge variant="outline">Hidden</Badge>;
  if (status === "removed") return <Badge variant="destructive">Removed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

async function getProfileId(email: string) {
  try {
    const profile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

function backerScope(userId: string, role: string) {
  if (role === "super_admin") return {};

  if (role === "parent") {
    return {
      campaign: {
        OR: [
          { createdByUserId: userId },
          { campaignStudents: { some: { student: { parentUserId: userId } } } },
          { campaignStudents: { some: { student: { guardians: { some: { guardianUserId: userId } } } } } },
        ],
      },
    };
  }

  if (role === "student") {
    return {
      campaign: {
        campaignStudents: { some: { student: { studentUserId: userId } } },
      },
    };
  }

  return {
    OR: [{ userId }, { donation: { userId } }],
  };
}

async function getBackerData(email: string, role: string) {
  const userId = await getProfileId(email);
  if (!userId && role !== "super_admin") {
    return {
      rows: [],
      error: null,
      stats: {
        totalBackers: 0,
        visibleTotal: 0,
        campaignsCount: 0,
        messageCount: 0,
        anonymousCount: 0,
      },
    };
  }

  try {
    const where = backerScope(userId ?? "", role);
    const rows = await prisma.campaignBacker.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        campaign: { select: { title: true, slug: true } },
        donation: {
          select: {
            status: true,
            paymentProviderOrderId: true,
            taxReceipts: { orderBy: { createdAt: "desc" }, take: 1, select: { receiptNumber: true } },
          },
        },
      },
    });

    const campaignIds = new Set(rows.map((row) => row.campaignId));
    const visibleRows = rows.filter((row) => row.status === "visible");
    const visibleTotal = visibleRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const messageCount = rows.filter((row) => row.message && row.showMessage).length;
    const anonymousCount = rows.filter((row) => row.isAnonymous).length;

    return {
      rows,
      error: null,
      stats: {
        totalBackers: rows.length,
        visibleTotal,
        campaignsCount: campaignIds.size,
        messageCount,
        anonymousCount,
      },
    };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Backers could not be loaded.",
      stats: {
        totalBackers: 0,
        visibleTotal: 0,
        campaignsCount: 0,
        messageCount: 0,
        anonymousCount: 0,
      },
    };
  }
}

function titleForRole(role: string) {
  if (role === "super_admin") return "Campaign backers";
  if (role === "donor_individual" || role === "donor_business") return "Campaigns you backed";
  return "Backers";
}

function descriptionForRole(role: string) {
  if (role === "super_admin") {
    return "All paid campaign donation activity connected to campaign backer records, receipts, and donor visibility settings.";
  }
  if (role === "parent") {
    return "Backers connected to the campaigns you manage and the students linked to your parent account.";
  }
  return "Paid campaign donation activity connected to your account.";
}

export async function BackersDashboard({
  session,
  backHref,
  backLabel = "Back to dashboard",
}: {
  session: ActSession;
  backHref: string;
  backLabel?: string;
}) {
  const data = await getBackerData(session.email, session.role);

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={backHref}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6 -ml-2 gap-1.5")}
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-primary">{titleForRole(session.role)}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{descriptionForRole(session.role)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Backer records" value={String(data.stats.totalBackers)} />
        <StatCard icon={Heart} label="Visible support" value={money(data.stats.visibleTotal)} />
        <StatCard icon={ExternalLink} label="Campaigns" value={String(data.stats.campaignsCount)} />
        <StatCard icon={MessageSquare} label="Messages" value={String(data.stats.messageCount)} />
      </div>

      {data.error ? (
        <Card className="mt-6 border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-heading text-base text-destructive">Backers could not load</CardTitle>
            <CardDescription>
              The page is available, but the live backer query failed. This usually means the deployed
              database needs the latest schema/migration or the relation query found old data in an
              unexpected shape.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{data.error}</CardContent>
        </Card>
      ) : null}

      <Card className="mt-6 overflow-hidden border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Backer activity</CardTitle>
          <CardDescription>
            {data.stats.anonymousCount} anonymous backer{data.stats.anonymousCount === 1 ? "" : "s"} included.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Backer</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length > 0 ? (
                  data.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{dt(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {row.isAnonymous ? "Anonymous" : row.displayName || "Supporter"}
                        </div>
                        {row.message && row.showMessage ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{row.message}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/campaigns/${row.campaign.slug}`} className="text-primary hover:underline">
                          {row.campaign.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{backerStatusBadge(row.status)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.donation?.status === "paid" ? "secondary" : "outline"}>
                          {row.donation?.status ?? "unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.donation?.taxReceipts[0]?.receiptNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {row.showAmount || session.role === "super_admin" ? money(row.amount) : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No campaign backer activity is connected to this account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="font-heading text-2xl text-primary">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
