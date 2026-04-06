import { AdminInvoicePanel } from "@/components/dashboard/admin/admin-invoice-panel";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminInvoicesPage() {
  return (
    <>
      <AdminPageHeader
        title="Invoices"
        description="Corporate pledges, offline checks, and custom billing artifacts — generate sample PDFs with PDFx-style components."
      />
      <AdminInvoicePanel />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Future: issue PDFs from paid donations, mark settled, tie to PayPal webhooks or manual
          entries; export for accounting.
        </CardContent>
      </Card>
    </>
  );
}
