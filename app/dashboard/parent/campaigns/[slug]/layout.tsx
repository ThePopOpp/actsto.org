import Link from "next/link";
import { redirect } from "next/navigation";

import { CampaignWorkspaceTabs } from "@/components/dashboard/campaign-workspace-tabs";
import { buttonVariants } from "@/lib/button-variants";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { requireManagedCampaign, UpdateError } from "@/lib/dashboard/campaign-updates";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for one campaign: heading, a link to the public page, and the
 * Details / Updates / Reviews / Notifications tabs.
 */
export default async function ParentCampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await getActSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  let campaign: { id: string; slug: string; title: string } | null = null;
  try {
    campaign = (await requireManagedCampaign(decoded, session)).campaign;
  } catch (error) {
    // A campaign that isn't ours (or doesn't exist) still renders its child,
    // which handles its own not-found. The tabs just don't get counts.
    if (!(error instanceof UpdateError)) throw error;
  }

  const [updates, reviews] = campaign
    ? await Promise.all([
        prisma.campaignUpdate.count({ where: { campaignId: campaign.id, status: "published" } }),
        prisma.review.count({ where: { campaignId: campaign.id, status: "approved" } }),
      ])
    : [0, 0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Campaign
          </p>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {campaign?.title ?? decoded}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/parent/campaigns"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to campaigns
          </Link>
          <Link
            href={`/campaigns/${encodeURIComponent(decoded)}`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View public page
          </Link>
        </div>
      </div>

      <CampaignWorkspaceTabs
        basePath="/dashboard/parent"
        slug={decoded}
        counts={{ updates, reviews }}
      />

      <div>{children}</div>
    </div>
  );
}
