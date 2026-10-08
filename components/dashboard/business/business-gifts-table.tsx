import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MyGift } from "@/lib/donors/my-giving";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/** The company's own paid gifts, with program and receipt. */
export function BusinessGiftsTable({ gifts, emptyText }: { gifts: MyGift[]; emptyText?: string }) {
  if (gifts.length === 0) {
    return (
      <Card className="border-dashed border-border">
        <CardContent className="space-y-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {emptyText ?? "No completed corporate gifts yet. Paid gifts appear here with their receipts."}
          </p>
          <Link href="/donate/business" className={cn(buttonVariants({ size: "sm" }))}>
            Make a corporate gift
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Tax year</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift) => (
              <tr key={gift.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{gift.date}</td>
                <td className="px-4 py-3">
                  {gift.programs.length ? (
                    <div className="flex flex-wrap gap-1">
                      {gift.programs.map((program) => (
                        <Badge key={program} variant="outline">
                          {program}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="outline">{gift.creditType}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {gift.campaignSlug ? (
                    <Link href={`/campaigns/${gift.campaignSlug}`} className="text-primary underline-offset-4 hover:underline">
                      {gift.campaignTitle}
                    </Link>
                  ) : (
                    gift.campaignTitle
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{gift.taxYear ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">${gift.amount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {gift.receiptNumber && gift.receiptId ? (
                    <a
                      href={`/api/receipts/${gift.receiptId}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {gift.receiptNumber}
                    </a>
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
  );
}
