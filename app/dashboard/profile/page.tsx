import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/auth/paths";
import { getActSession } from "@/lib/auth/session-server";

export default async function MyProfilePage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/profile");
  if (session.role === "super_admin") {
    redirect("/dashboard/admin/settings");
  }
  redirect(`${dashboardPathForRole(session.role)}/profile`);
}
