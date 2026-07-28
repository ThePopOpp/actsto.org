import Link from "next/link";
import { ArrowLeft, ExternalLink, Heart, MessageSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActSession } from "@/lib/auth/types";
import { buttonVariants } from "@/lib/button-variants";
import { getProfileForEmail, managedCampaignWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function dt(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function statusBadge(status: string) {
  const s = (status || "pending").toLowerCase();
  if (s === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (s.includes("refund")) return <Badge variant="outline">Refunded</Badge>;
  if (s === "failed" || s === "cancelled") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="secondary">{status || "pending"}</Badge>;
}

/** Scope donations by the viewer's role. */
function donationScope(userId: string, role: string): Prisma.DonationWhereInput {
  if (role === "super_admin") return {};
  if (role === "parent") return { campaign: managedCampaignWhere(userId) };
  if (role === "student") {
    return { campaign: { campaignStudents: { some: { student: { studentUserId: userId } } } } };
  }
  return { userId };
}

type DonorRow = {
  id: string;
  createdAt: Date;
  donorName: string;
  anonymous: boolean;
  message: string | null;
  campaignTitle: string;
  campaignSlug: string | null;
  status: string;
  orderId: string | null;
  receiptNumber: string | null;
  amount: number;
};

const EMPTY = {
  rows: [] as DonorRow[],
  error: null as string | null,
  stats: { totalBackers: 0, paidTotal: 0, campaignsCount: 0, messageCount: 0, anonymousCount: 0 },
};

async function getBackerData(email: string, role: string) {
  const profile = await getProfileForEmail(email).catch(() => null);
  const userId = profile?.id ?? null;
  if (!userId && role !== "super_admin") return EMPTY;

  try {
    const donations = await prisma.donation.findMany({
      where: donationScope(userId ?? "", role),
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        campaign: { select: { title: true, slug: true } },
        donationDetail: {
          select: { donorFirstName: true, donorLastName: true, publicDisplayName: true, donorEmail: true },
        },
        taxReceipts: { orderBy: { createdAt: "desc" }, take: 1, select: { receiptNumber: true } },
      },
    });

    // Donor names for registered users (batch).
    const userIds = Array.from(new Set(donations.map((d) => d.userId).filter(Boolean))) as string[];
    const profiles = userIds.length
      ? await prisma.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, fullName: true, email: true } })
      : [];
    const nameByUser = new Map(profiles.map((p) => [p.id, p.displayName || p.fullName || p.email]));

    const rows: DonorRow[] = donations.map((d) => {
      const detailName = [d.donationDetail?.donorFirstName, d.donationDetail?.donorLastName].filter(Boolean).join(" ").trim();
      const donorName = d.anonymous
        ? "Anonymous"
        : d.donationDetail?.publicDisplayName?.trim() ||
          detailName ||
          (d.userId ? nameByUser.get(d.userId) : null) ||
          d.donationDetail?.donorEmail ||
          "Supporter";
      return {
        id: d.id,
        createdAt: d.createdAt,
        donorName: donorName || "Supporter",
        anonymous: d.anonymous,
        message: d.donorMessage,
        campaignTitle: d.campaign?.title ?? "General fund",
        campaignSlug: d.campaign?.slug ?? null,
        status: d.status,
        orderId: d.paymentProviderOrderId,
        receiptNumber: d.taxReceipts[0]?.receiptNumber ?? null,
        amount: Number(d.amount ?? 0),
      };
    });

    const paidTotal = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);
    const campaignIds = new Set(donations.map((d) => d.campaignId).filter(Boolean));
    return {
      rows,
      error: null,
      stats: {
        totalBackers: rows.length,
        paidTotal,
        campaignsCount: campaignIds.size,
        messageCount: rows.filter((r) => r.message).length,
        anonymousCount: rows.filter((r) => r.anonymous).length,
      },
    };
  } catch (error) {
    return { ...EMPTY, error: error instanceof Error ? error.message : "Donors could not be loaded." };
  }
}

function titleForRole(role: string) {
  if (role === "super_admin") return "Campaign donors";
  if (role === "donor_individual" || role === "donor_business") return "Campaigns you backed";
  return "Donors";
}

function descriptionForRole(role: string) {
  if (role === "super_admin") {
    return "Every donation record — donor, campaign, payment, and tax receipt.";
  }
  if (role === "parent") {
    return "Donations connected to the campaigns you manage and the students linked to your parent account.";
  }
  if (role === "donor_individual" || role === "donor_business") {
    return "Your donation history, payment status, and tax receipts.";
  }
  return "Donation activity connected to your account.";
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
    <div className="w-full space-y-6">
      <Link
        href={backHref}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 gap-1.5")}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Donation records" value={String(data.stats.totalBackers)} />
        <StatCard icon={Heart} label="Paid support" value={money(data.stats.paidTotal)} />
        <StatCard icon={ExternalLink} label="Campaigns" value={String(data.stats.campaignsCount)} />
        <StatCard icon={MessageSquare} label="Messages" value={String(data.stats.messageCount)} />
      </div>

      {data.error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-heading text-base text-destructive">Donors could not load</CardTitle>
            <CardDescription>
              The page is available, but the live donation query failed. This usually means the deployed
              database needs the latest schema/migration.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{data.error}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Donor activity</CardTitle>
          <CardDescription>
            {data.stats.anonymousCount} anonymous donor{data.stats.anonymousCount === 1 ? "" : "s"} included.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donor</th>
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
                        <div className="font-medium text-foreground">{row.donorName}</div>
                        {row.message ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{row.message}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {row.campaignSlug ? (
                          <Link href={`/campaigns/${row.campaignSlug}`} className="text-primary hover:underline">
                            {row.campaignTitle}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{row.campaignTitle}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.orderId ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.receiptNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{money(row.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No donation activity is connected to this account yet.
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

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
