import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getMyGiving } from "@/lib/donors/my-giving";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default async function DonorReceiptsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/donor/receipts");

  const { gifts } = await getMyGiving(session);
  const receipts = gifts.filter((gift) => gift.receiptNumber);

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Receipts & tax"
        description="Acknowledgments for your paid gifts. Each receipt is also emailed to you when the gift is completed."
      />

      {receipts.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No receipts on your account yet. A receipt is issued as soon as a donation is paid.
            </p>
            <Link href="/dashboard/donor/donations" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              View donations
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Tax year</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((gift) => (
                  <tr key={gift.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{gift.receiptNumber}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{gift.date}</td>
                    <td className="px-4 py-3">{gift.campaignTitle}</td>
                    <td className="px-4 py-3 tabular-nums">{gift.taxYear ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ${gift.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
