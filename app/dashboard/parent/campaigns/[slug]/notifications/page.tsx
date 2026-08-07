import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { getProfileForEmail } from "@/lib/dashboard/parent-scope";
import { formatLongDate } from "@/lib/utils";

export const metadata = { title: "Campaign notifications" };

/**
 * Activity on this campaign, drawn from the dashboard notification feed the
 * rest of the app already writes to.
 */
export default async function ParentCampaignNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getActSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const profile = await getProfileForEmail(session.email);

  const notifications = profile
    ? await prisma.dashboardNotification
        .findMany({
          where: {
            userId: profile.id,
            // The feed is per-user, so narrow to items that mention this campaign.
            OR: [{ actionUrl: { contains: decoded } }, { message: { contains: decoded } }],
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        // Degrade to the empty state rather than taking the page down. A feed of
        // activity is not worth a 500.
        .catch(() => [])
    : [];

  return (
    <div className="space-y-3">
      {notifications.length === 0 ? (
        <Alert>
          <Bell className="size-4" />
          <AlertDescription>
            Nothing yet. Donations, reviews and messages about this campaign will appear here.
          </AlertDescription>
        </Alert>
      ) : (
        notifications.map((notification) => (
          <Card key={notification.id} className="border-border/80">
            <CardContent className="space-y-1 p-4">
              <p className="font-medium text-foreground">{notification.title}</p>
              {notification.message ? (
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatLongDate(notification.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
