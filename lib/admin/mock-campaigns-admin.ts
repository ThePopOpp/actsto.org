import type { Campaign } from "@/lib/campaigns";

export type CampaignModerationStatus = "pending" | "approved" | "featured" | "rejected";

export type AdminCampaignRow = Campaign & {
  moderationStatus: CampaignModerationStatus;
  reviewer?: string;
};

export function withAdminMeta(
  campaigns: Campaign[],
  statuses: CampaignModerationStatus[]
): AdminCampaignRow[] {
  return campaigns.map((c, i) => ({
    ...c,
    moderationStatus: statuses[i % statuses.length] ?? "approved",
    reviewer: i % 2 === 0 ? "J. Waters" : "C. Leavitt",
  }));
}
