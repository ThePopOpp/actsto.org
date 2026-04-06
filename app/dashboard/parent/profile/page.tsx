import { redirect } from "next/navigation";

import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { getActSession } from "@/lib/auth/session-server";

export default async function ParentProfilePage() {
  const s = await getActSession();
  if (!s || s.role !== "parent") {
    redirect("/login?next=/dashboard/parent/profile&role=parent");
  }
  return (
    <UserProfileEditor
      defaultName={s.name}
      defaultEmail={s.email}
      defaultPhone="(480) 352-7598"
      defaultCity="Phoenix"
    />
  );
}
