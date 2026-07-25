import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Messenger } from "@/components/messaging/messenger";
import { getMessagingUser } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const me = await getMessagingUser();
  if (!me) redirect("/login?next=/dashboard/admin/messages");

  return (
    <>
      <AdminPageHeader title="Messages" description="Direct messages with parents, students, and donors. Super Admins can message any account." />
      <Messenger currentUserId={me.userId} />
    </>
  );
}
