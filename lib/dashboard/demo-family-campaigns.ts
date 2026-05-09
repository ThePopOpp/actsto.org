import type { Campaign } from "@/lib/campaigns";
import { getSiteCampaignBySlug, getSiteCampaigns } from "@/lib/campaigns-source";

const SLUGS = new Set(["waters-family-fundraiser", "leavitt-family-fundraiser"]);

/** Sample campaigns shown on parent / shared-family demo dashboards. */
export async function getDemoFamilyCampaigns(): Promise<Campaign[]> {
  return (await getSiteCampaigns()).filter((c) => SLUGS.has(c.slug));
}

/** Single-student demo campaign (Jace Waters). */
export async function getDemoStudentCampaigns(): Promise<Campaign[]> {
  const c = await getSiteCampaignBySlug("waters-family-fundraiser");
  return c ? [c] : [];
}

export async function getLiveDemoFamilyCampaigns(): Promise<Campaign[]> {
  return getDemoFamilyCampaigns();
}

export async function getLiveDemoStudentCampaigns(): Promise<Campaign[]> {
  return getDemoStudentCampaigns();
}
