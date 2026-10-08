import { redirect } from "next/navigation";

import { BusinessGiftsTable } from "@/components/dashboard/business/business-gifts-table";
import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getBusinessAccount } from "@/lib/donors/business-account";

export const dynamic = "force-dynamic";

export default async function BusinessInvoicesPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/business/invoices");
  const account = await getBusinessAccount(session);
  const receipted = account.gifts.filter((gift) => gift.receiptId);

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Invoices & receipts"
        description="Invoices ACT has sent your company against a pledge, and the receipt for every completed gift."
      />

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-primary">Invoices</h2>
        {account.invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices. ACT sends one only when your company pledges a gift to be paid later.
          </p>
        ) : (
          <Card className="overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {account.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <a
                          href={`/api/business/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </a>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{invoice.issuedDate}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{invoice.dueDate}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">${invoice.total.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={invoice.status === "paid" ? "secondary" : "outline"} className="capitalize">
                          {invoice.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-primary">Receipts</h2>
        <BusinessGiftsTable gifts={receipted} emptyText="No receipts yet. Each completed gift gets a receipt here." />
      </div>
    </div>
  );
}
