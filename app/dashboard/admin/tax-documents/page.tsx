import Link from "next/link";
import { ExternalLink, FileText, Receipt } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AdminTaxCreditLimitsForm } from "@/components/dashboard/admin/admin-tax-credit-limits-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AdminTaxDocumentsPage() {
  return (
    <>
      <AdminPageHeader
        title="Tax Documents"
        description="Arizona tax-credit limits, the ADOR tax disclosure, and receipt policy."
      />
      <div className="space-y-6">
        <AdminTaxCreditLimitsForm />

        <Card className="border-border/80">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <Link
              href="/legal/terms/tax-disclosure"
              target="_blank"
              className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium text-primary">
                  ADOR tax disclosure <ExternalLink className="size-3.5 text-muted-foreground" />
                </p>
                <p className="truncate text-xs text-muted-foreground">Public Arizona Department of Revenue disclosure.</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/receipts"
              className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-primary">Tax receipts</p>
                <p className="truncate text-xs text-muted-foreground">Generated receipts for paid donations.</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
