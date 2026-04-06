import type { Campaign } from "@/lib/campaigns";
import type { AdminCampaignRow } from "@/lib/admin/mock-campaigns-admin";

const STORAGE_KEY = "act-admin-campaign-rows-v1";

export function loadAdminCampaignRows(): AdminCampaignRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as AdminCampaignRow[];
  } catch {
    return null;
  }
}

export function saveAdminCampaignRows(rows: AdminCampaignRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

/** Replace row with `oldSlug`, remove conflicts on `campaign.slug`, append merged row (preserves moderation when possible). */
export function upsertAdminCampaignRow(
  rows: AdminCampaignRow[],
  campaign: Campaign,
  oldSlug: string | null
): AdminCampaignRow[] {
  const prev = oldSlug ? rows.find((r) => r.slug === oldSlug) : rows.find((r) => r.slug === campaign.slug);
  const merged: AdminCampaignRow = {
    ...campaign,
    moderationStatus: prev?.moderationStatus ?? "pending",
    reviewer: prev?.reviewer ?? "Unassigned",
  };

  const filtered = rows.filter((r) => {
    if (oldSlug && r.slug === oldSlug) return false;
    if (!oldSlug && r.slug === campaign.slug) return false;
    if (oldSlug && oldSlug !== campaign.slug && r.slug === campaign.slug) return false;
    return true;
  });

  return [...filtered, merged];
}

export function removeAdminCampaignRow(rows: AdminCampaignRow[], slug: string): AdminCampaignRow[] {
  return rows.filter((r) => r.slug !== slug);
}
