import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { PlansIndex } from "@/components/plans/plans-index";
import { getActSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const session = await getActSession();
  return (
    <>
      <AdminPageHeader
        title="Plans"
        description="Plan Builder — organise work into tasks and groups, and track it on a board, table, list, or calendar."
      />
      <PlansIndex myEmail={session?.email ?? ""} />
    </>
  );
}
