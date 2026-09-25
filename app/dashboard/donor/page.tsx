import { redirect } from "next/navigation";

import { DonorDashboardContent } from "@/components/dashboard/donor-dashboard-content";
import { getActSession } from "@/lib/auth/session-server";
import { getMyGiving } from "@/lib/donors/my-giving";

export default async function DonorDashboardPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/donor");

  const { gifts, saved, totalThisTaxYear, receiptCount } = await getMyGiving(session);

  return (
    <DonorDashboardContent
      gifts={gifts}
      saved={saved}
      totalThisTaxYear={totalThisTaxYear}
      receiptCount={receiptCount}
    />
  );
}
