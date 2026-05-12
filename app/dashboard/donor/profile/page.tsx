import { redirect } from "next/navigation";

import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { getActSession } from "@/lib/auth/session-server";

export default async function DonorProfilePage() {
  const s = await getActSession();
  if (!s || s.role !== "donor_individual") {
    redirect("/login?next=/dashboard/donor/profile&role=donor_individual");
  }
  return (
    <UserProfileEditor
      defaultName={s.name}
      defaultEmail={s.email}
    />
  );
}
