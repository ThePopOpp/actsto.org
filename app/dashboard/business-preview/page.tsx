import { BusinessDashboardContent } from "@/components/dashboard/business-dashboard-content";
import { emptyBusinessAccount } from "@/lib/donors/business-account";

export default function BusinessPreviewPage() {
  return <BusinessDashboardContent account={emptyBusinessAccount()} />;
}
