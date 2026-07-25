import { redirect } from "next/navigation";

import { Messenger } from "@/components/messaging/messenger";
import { getMessagingUser } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

export default async function DonorMessagesPage() {
  const me = await getMessagingUser();
  if (!me) redirect("/login?next=/dashboard/donor/messages");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Direct messages with parents and opted-in students you support.</p>
      </div>
      <Messenger currentUserId={me.userId} />
    </div>
  );
}
