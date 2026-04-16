import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";
import { withAdminMeta } from "@/lib/admin/mock-campaigns-admin";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";

/** Seed rows for the Super Admin campaign directory (matches prior localStorage demo). */
export function seedAdminCampaignRows(): AdminCampaignRow[] {
  const clone = JSON.parse(JSON.stringify(MOCK_CAMPAIGNS)) as typeof MOCK_CAMPAIGNS;
  return withAdminMeta(clone, ["pending", "approved", "featured", "approved", "rejected"]);
}
