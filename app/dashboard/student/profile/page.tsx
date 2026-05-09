import { redirect } from "next/navigation";

import { StudentProfileEditor } from "@/components/dashboard/student-profile-editor";
import { getActSession } from "@/lib/auth/session-server";

export default async function StudentProfilePage() {
  const s = await getActSession();
  if (!s || s.role !== "student") {
    redirect("/login?next=/dashboard/student/profile&role=student");
  }
  return <StudentProfileEditor />;
}
