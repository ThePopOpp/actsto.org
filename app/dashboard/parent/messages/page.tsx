import { MailOpen } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { getManagedCampaignRefs, getProfileForEmail } from "@/lib/dashboard/parent-scope";
import { prisma } from "@/lib/prisma";

function dt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function preview(body: string | null | undefined) {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 137)}...` : text || "No message preview available.";
}

async function getThreads(userId: string, email: string) {
  const campaigns = await getManagedCampaignRefs(userId);
  const slugs = campaigns.map((campaign) => campaign.slug);
  const titles = campaigns.map((campaign) => campaign.title);

  return prisma.emailThread.findMany({
    where: {
      channel: "email",
      OR: [
        { campaignSlug: { in: slugs } },
        { campaignTitle: { in: titles } },
        { fromEmail: { equals: email, mode: "insensitive" } },
        {
          messages: {
            some: {
              OR: [
                { fromEmail: { equals: email, mode: "insensitive" } },
                { toEmail: { equals: email, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export default async function ParentMessagesPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/messages");

  const profile = await getProfileForEmail(session.email);
  const threads = profile ? await getThreads(profile.id, profile.email).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Messages</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Email threads connected to your campaigns, students, and account email.
        </p>
      </div>

      <div className="space-y-3">
        {threads.length > 0 ? (
          threads.map((thread) => {
            const last = thread.messages[0];
            return (
              <Card key={thread.id} className="border-border/80">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-primary">{thread.subject ?? "Untitled thread"}</p>
                      {thread.unread ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      From {thread.fromName || thread.fromEmail || last?.fromEmail || "Unknown sender"}
                    </p>
                    {thread.campaignTitle ? (
                      <p className="mt-1 text-xs text-muted-foreground">Campaign: {thread.campaignTitle}</p>
                    ) : null}
                    <p className="mt-2 max-w-3xl text-sm">{preview(last?.bodyText)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{dt(thread.lastMessageAt)}</span>
                    <Button size="sm" variant="outline" disabled>
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <MailOpen className="size-5" />
              No campaign messages are connected to your parent account yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
