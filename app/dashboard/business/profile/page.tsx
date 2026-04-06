import { redirect } from "next/navigation";

import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { getActSession } from "@/lib/auth/session-server";

export default async function BusinessProfilePage() {
  const s = await getActSession();
  if (!s || s.role !== "donor_business") {
    redirect("/login?next=/dashboard/business/profile&role=donor_business");
  }
  return (
    <UserProfileEditor
      defaultName={s.name}
      defaultEmail={s.email}
      defaultPhone="(602) 421-8301"
      defaultAddress="2200 E Camelback Rd"
      defaultCity="Phoenix"
      defaultZip="85016"
    />
  );
}
