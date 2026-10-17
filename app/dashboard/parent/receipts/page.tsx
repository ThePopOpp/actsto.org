import { Download, FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { buttonVariants } from "@/lib/button-variants";
import { getMyGiving } from "@/lib/donors/my-giving";
import { cn } from "@/lib/utils";

/**
 * Tax receipts for gifts this account made itself.
 *
 * This page used to list every receipt for gifts to the family's campaigns,
 * with the donor's name and a download link. A tax receipt belongs to the
 * donor, and families must not see who gave (award policy, donor privacy), so
 * it now shows only the parent's own giving, exactly as the donor portal does.
 */
export default async function ParentReceiptsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/receipts");

  const { gifts } = await getMyGiving(session);
  const receipts = gifts.filter((gift) => gift.receiptNumber);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Receipts &amp; tax</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Tax receipts for gifts you made yourself. Receipts for gifts to your campaigns belong to the people who gave
          them, so they aren&apos;t shown here.
        </p>
      </div>

      {receipts.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <FileText className="size-5" />
            You have no tax receipts yet. A receipt is issued as soon as one of your gifts is paid.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Tax year</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((gift) => (
                  <tr key={gift.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{gift.receiptNumber}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{gift.date}</td>
                    <td className="px-4 py-3">{gift.campaignTitle}</td>
                    <td className="px-4 py-3 tabular-nums">{gift.taxYear ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">${gift.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {gift.receiptId ? (
                        <a
                          href={`/api/receipts/${gift.receiptId}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      ) : null}
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
