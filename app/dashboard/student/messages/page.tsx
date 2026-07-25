import { redirect } from "next/navigation";

import { Messenger } from "@/components/messaging/messenger";
import { StudentDonorOptIn } from "@/components/messaging/student-donor-opt-in";
import { getMessagingUser } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

export default async function StudentMessagesPage() {
  const me = await getMessagingUser();
  if (!me) redirect("/login?next=/dashboard/student/messages");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Direct messages with your parents/guardians and (if you&apos;ve opted in) donors.</p>
      </div>
      <StudentDonorOptIn />
      <Messenger currentUserId={me.userId} />
    </div>
  );
}
