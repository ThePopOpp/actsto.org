import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getBusinessAccount } from "@/lib/donors/business-account";

export const dynamic = "force-dynamic";

/**
 * Corporate gifts grouped by tax year. ACT doesn't file a company's return, so
 * there is no "filed" status here — only what was given and what was receipted.
 */
export default async function BusinessTaxesPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/business/taxes");
  const account = await getBusinessAccount(session);
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Taxes"
        description="Your company's gifts to ACT by tax year, for your corporate tax-credit claim. Corporate credits require ADOR pre-approval before the gift; your tax advisor files the claim."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Given in {year}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
              ${account.totalThisTaxYear.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Gifts without a receipt yet</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
              {account.gifts.filter((gift) => !gift.receiptNumber).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {account.byTaxYear.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to report yet. Completed gifts are grouped here by tax year.
        </p>
      ) : (
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3">Tax year</th>
                  <th className="px-4 py-3 text-right">Gifts</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Receipts</th>
                </tr>
              </thead>
              <tbody>
                {account.byTaxYear.map((row) => (
                  <tr key={row.taxYear} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">{row.taxYear}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">${row.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.receipts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-sm text-muted-foreground">
        Receipt PDFs are on{" "}
        <Link href="/dashboard/business/invoices" className="text-primary underline-offset-4 hover:underline">
          Invoices &amp; receipts
        </Link>
        .
      </p>
    </div>
  );
}
