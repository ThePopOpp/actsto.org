import { AdminAccountingHome } from "@/components/dashboard/admin-accounting-home";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export const dynamic = "force-dynamic";

export default function AdminAccountingPage() {
  return (
    <>
      <AdminPageHeader
        title="Accounting"
        description="Financial snapshot across donations, payments, invoices, receipts, and tax documents."
      />
      <AdminAccountingHome basePath="/dashboard/admin" />
    </>
  );
}
