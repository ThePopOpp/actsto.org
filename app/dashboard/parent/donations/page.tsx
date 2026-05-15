import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getProfileForEmail, managedDonationWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function donorName(row: Awaited<ReturnType<typeof getRows>>[number]) {
  if (row.anonymous) return "Anonymous";
  const detail = row.donationDetail;
  const name = [detail?.donorFirstName, detail?.donorLastName].filter(Boolean).join(" ").trim();
  return detail?.publicDisplayName || name || detail?.donorEmail || "Supporter";
}

async function getRows(userId: string) {
  return prisma.donation.findMany({
    where: {
      AND: [
        managedDonationWhere(userId),
        { status: { in: ["paid", "refunded", "partially_refunded"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      campaign: { select: { title: true, slug: true } },
      donationDetail: true,
      donorRecommendation: {
        include: {
          recommendedCampaign: { select: { title: true, slug: true } },
          recommendedStudent: { select: { firstName: true, lastName: true } },
          recommendedSchool: { select: { name: true } },
        },
      },
      taxReceipts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { receiptNumber: true, status: true },
      },
    },
  });
}

export default async function ParentDonationsReceivedPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/donations");

  const profile = await getProfileForEmail(session.email);
  const rows = profile ? await getRows(profile.id).catch(() => []) : [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Donations received</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Gifts connected to campaigns you manage and students linked to your parent account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 p-4">
          <p className="text-sm text-muted-foreground">Received</p>
          <p className="mt-2 font-heading text-2xl text-primary">{money(total)}</p>
        </Card>
        <Card className="border-border/80 p-4">
          <p className="text-sm text-muted-foreground">Paid gifts</p>
          <p className="mt-2 font-heading text-2xl text-primary">{rows.length}</p>
        </Card>
        <Card className="border-border/80 p-4">
          <p className="text-sm text-muted-foreground">Receipts</p>
          <p className="mt-2 font-heading text-2xl text-primary">
            {rows.filter((row) => row.taxReceipts.length > 0).length}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const campaign = row.campaign ?? row.donorRecommendation?.recommendedCampaign;
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{date(row.createdAt)}</td>
                      <td className="px-4 py-3">{donorName(row)}</td>
                      <td className="px-4 py-3">
                        {campaign ? (
                          <Link href={`/campaigns/${campaign.slug}`} className="text-primary hover:underline">
                            {campaign.title}
                          </Link>
                        ) : (
                          "General fund"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{row.donationType.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.taxReceipts[0]?.receiptNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{money(row.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-primary" disabled>
                          Thank
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No paid donations are connected to your campaigns yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
