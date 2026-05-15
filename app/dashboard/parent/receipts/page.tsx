import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { buttonVariants } from "@/lib/button-variants";
import { getProfileForEmail, managedDonationWhere } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function money(value: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
}

function date(value: Date | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

async function getReceipts(userId: string) {
  return prisma.taxReceipt.findMany({
    where: {
      donation: {
        AND: [
          managedDonationWhere(userId),
          { status: { in: ["paid", "refunded", "partially_refunded"] } },
        ],
      },
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      donation: {
        include: {
          campaign: { select: { title: true, slug: true } },
          donationDetail: true,
          donorRecommendation: {
            include: { recommendedCampaign: { select: { title: true, slug: true } } },
          },
        },
      },
    },
  });
}

export default async function ParentReceiptsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/receipts");

  const profile = await getProfileForEmail(session.email);
  const receipts = profile ? await getReceipts(profile.id).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Receipts &amp; tax</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Tax receipts generated from paid donations connected to your campaigns.
        </p>
      </div>

      <div className="space-y-3">
        {receipts.length > 0 ? (
          receipts.map((receipt) => {
            const campaign = receipt.donation.campaign ?? receipt.donation.donorRecommendation?.recommendedCampaign;
            const donor = receipt.issuedToName || receipt.donation.donationDetail?.donorEmail || "Supporter";
            return (
              <Card key={receipt.id} className="border-border/80">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-primary">{receipt.receiptNumber}</p>
                      <Badge variant="outline">{receipt.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {donor} · {money(receipt.amount ?? receipt.donation.amount)} · {date(receipt.issuedAt)}
                    </p>
                    {campaign ? (
                      <Link href={`/campaigns/${campaign.slug}`} className="mt-1 block text-sm text-primary hover:underline">
                        {campaign.title}
                      </Link>
                    ) : null}
                  </div>
                  {receipt.receiptPdfUrl ? (
                    <Link
                      href={receipt.receiptPdfUrl}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                    >
                      <Download className="size-4" />
                      Download
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5" disabled>
                      <FileText className="size-4" />
                      Generated
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <FileText className="size-5" />
              No tax receipts are connected to your campaigns yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
