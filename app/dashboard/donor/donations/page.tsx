import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getMyGiving } from "@/lib/donors/my-giving";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default async function DonorDonationsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/donor/donations");

  const { gifts } = await getMyGiving(session);

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Donations"
        description="Your Arizona tax-credit gifts and printable acknowledgments. Confirm annual limits with your tax advisor."
      />

      {gifts.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No completed gifts on your account yet. Once a donation is paid it appears here with its
              receipt.
            </p>
            <Link href="/donate/detailed" className={cn(buttonVariants({ size: "sm" }))}>
              Make a gift
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {gifts.length} completed gift{gifts.length === 1 ? "" : "s"} on file.
          </p>
          <Card className="overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Credit type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.map((gift) => (
                    <tr key={gift.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{gift.date}</td>
                      <td className="px-4 py-3">
                        {gift.campaignSlug ? (
                          <Link
                            href={`/campaigns/${gift.campaignSlug}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {gift.campaignTitle}
                          </Link>
                        ) : (
                          gift.campaignTitle
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{gift.creditType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ${gift.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {gift.receiptNumber ? (
                          <Link
                            href="/dashboard/donor/receipts"
                            className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                          >
                            {gift.receiptNumber}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
