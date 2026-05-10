import { redirect } from "next/navigation";

import { BackersDashboard } from "@/components/dashboard/backers-dashboard";
import { getActSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function AdminBackersPage() {
  const session = await getActSession().catch(() => null);
  if (!session || session.role !== "super_admin") {
    redirect("/login?next=/dashboard/admin/backers&role=super_admin");
  }

  return <BackersDashboard session={session} backHref="/dashboard/admin" />;
}
