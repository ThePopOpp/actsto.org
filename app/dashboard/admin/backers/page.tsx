import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { DonorsWorkspace } from "@/components/dashboard/admin/donors/donors-workspace";
import { getActSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function AdminBackersPage() {
  const session = await getActSession().catch(() => null);
  if (!session || session.role !== "super_admin") {
    redirect("/login?next=/dashboard/admin/backers&role=super_admin");
  }

  return (
    <>
      <AdminPageHeader
        title="Donors"
        description="Every donation — donor, campaign, payment status, and tax receipt. Search, filter, view, and export."
      />
      <DonorsWorkspace />
    </>
  );
}
