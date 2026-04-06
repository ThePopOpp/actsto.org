import { redirect } from "next/navigation";

import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { getActSession } from "@/lib/auth/session-server";

export default async function StudentProfilePage() {
  const s = await getActSession();
  if (!s || s.role !== "student") {
    redirect("/login?next=/dashboard/student/profile&role=student");
  }
  return (
    <UserProfileEditor
      defaultName={s.name}
      defaultEmail={s.email}
      defaultPhone="(480) 555-0198"
      defaultCity="Phoenix"
    />
  );
}
