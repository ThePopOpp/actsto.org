import { MarketingHub } from "@/components/dashboard/marketing/marketing-hub";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminMarketingPage() {
  return (
    <>
      <AdminPageHeader
        title="Marketing · ACTSTO.org"
        description="Digital postcards, print mailers, and social assets for fundraising. Drafts and templates stay in the browser until you connect CMS, print partners, and USPS or vendor APIs."
      />
      <MarketingHub variant="admin" />
    </>
  );
}
