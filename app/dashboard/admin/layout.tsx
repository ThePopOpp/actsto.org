import { redirect } from "next/navigation";

import { AdminAppShell } from "@/components/dashboard/admin-app-shell";
import { getActSession } from "@/lib/auth/session-server";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getActSession();
  if (!s || s.role !== "super_admin") {
    redirect("/login?next=/dashboard/admin&role=super_admin");
  }

  return <AdminAppShell user={s}>{children}</AdminAppShell>;
}
