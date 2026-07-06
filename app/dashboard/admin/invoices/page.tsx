import { AdminInvoicePanel } from "@/components/dashboard/admin/admin-invoice-panel";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminInvoicesPage() {
  return (
    <>
      <AdminPageHeader
        title="Invoices"
        description="Bill business donors against their pledges — generate PDFs, email them, and track payment status."
      />
      <AdminInvoicePanel />
    </>
  );
}
