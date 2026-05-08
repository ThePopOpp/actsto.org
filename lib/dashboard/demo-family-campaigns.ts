import { MOCK_CAMPAIGNS, type Campaign } from "@/lib/campaigns";
import { applyLiveCampaignDonationTotals } from "@/lib/campaigns-live";

const SLUGS = new Set(["waters-family-fundraiser", "leavitt-family-fundraiser"]);

/** Sample campaigns shown on parent / shared-family demo dashboards. */
export function getDemoFamilyCampaigns(): Campaign[] {
  return MOCK_CAMPAIGNS.filter((c) => SLUGS.has(c.slug));
}

/** Single-student demo campaign (Jace Waters). */
export function getDemoStudentCampaigns(): Campaign[] {
  const c = MOCK_CAMPAIGNS.find((x) => x.slug === "waters-family-fundraiser");
  return c ? [c] : [];
}

export async function getLiveDemoFamilyCampaigns(): Promise<Campaign[]> {
  return applyLiveCampaignDonationTotals(getDemoFamilyCampaigns());
}

export async function getLiveDemoStudentCampaigns(): Promise<Campaign[]> {
  return applyLiveCampaignDonationTotals(getDemoStudentCampaigns());
}
