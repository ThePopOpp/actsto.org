import { AdminReceiptsList } from "@/components/dashboard/admin-receipts-list";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export const dynamic = "force-dynamic";

export default function AdminReceiptsPage() {
  return (
    <>
      <AdminPageHeader
        title="Receipts"
        description="Generated Arizona tax-credit receipts for paid donations."
      />
      <AdminReceiptsList />
    </>
  );
}
