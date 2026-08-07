import "server-only";

import { prisma } from "@/lib/prisma";
import { getProfileForEmail, managedCampaignWhere } from "@/lib/dashboard/parent-scope";
import type { ActSession } from "@/lib/auth/types";

/**
 * Campaign updates, written by the family and read by supporters.
 *
 * The `campaign_updates` table and the public "Updates" tab already existed;
 * what was missing was any way for a parent to write one, so the tab always
 * said "No updates yet."
 *
 * Ownership goes through `managedCampaignWhere`, the same clause the rest of the
 * parent dashboard uses, so a parent can only touch their own campaigns.
 */

export type CampaignUpdateRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export class UpdateError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpdateError";
  }
}

/** Resolve a slug to a campaign this session is allowed to manage. */
export async function requireManagedCampaign(slug: string, session: ActSession) {
  const profile = await getProfileForEmail(session.email);
  if (!profile) throw new UpdateError("Profile not found.", 404);

  const where =
    profile.isSuperAdmin || session.role === "super_admin"
      ? { slug }
      : { slug, ...managedCampaignWhere(profile.id) };

  const campaign = await prisma.campaign.findFirst({
    where,
    select: { id: true, slug: true, title: true, reviewsEnabled: true },
  });
  if (!campaign) throw new UpdateError("Campaign not found.", 404);

  return { campaign, profile };
}

function toRow(update: {
  id: string;
  title: string;
  body: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignUpdateRow {
  return {
    id: update.id,
    title: update.title,
    body: update.body ?? "",
    status: update.status,
    publishedAt: update.publishedAt?.toISOString() ?? null,
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString(),
  };
}

export async function listCampaignUpdates(campaignId: string): Promise<CampaignUpdateRow[]> {
  const rows = await prisma.campaignUpdate.findMany({
    where: { campaignId },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toRow);
}

export function parseUpdateInput(body: unknown): { title: string; body: string; publish: boolean } {
  if (!body || typeof body !== "object") throw new UpdateError("Nothing to save.", 400);
  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) throw new UpdateError("Give this update a title.", 400);
  if (title.length > 160) throw new UpdateError("That title is too long.", 400);

  const text = typeof raw.body === "string" ? raw.body.trim() : "";
  if (!text) throw new UpdateError("Write something for your supporters.", 400);

  return { title, body: text.slice(0, 20000), publish: raw.publish === true };
}

export async function createCampaignUpdate(
  campaignId: string,
  authorUserId: string,
  input: { title: string; body: string; publish: boolean },
): Promise<CampaignUpdateRow> {
  const row = await prisma.campaignUpdate.create({
    data: {
      campaignId,
      authorUserId,
      title: input.title,
      body: input.body,
      status: input.publish ? "published" : "draft",
      // Only a published update gets a date — the public tab filters on status,
      // and a draft carrying a publish date reads as live in every listing.
      publishedAt: input.publish ? new Date() : null,
    },
  });
  return toRow(row);
}

export async function updateCampaignUpdate(
  updateId: string,
  campaignId: string,
  input: { title: string; body: string; publish: boolean },
): Promise<CampaignUpdateRow> {
  const existing = await prisma.campaignUpdate.findFirst({
    where: { id: updateId, campaignId },
    select: { id: true, publishedAt: true },
  });
  if (!existing) throw new UpdateError("That update wasn't found.", 404);

  const row = await prisma.campaignUpdate.update({
    where: { id: updateId },
    data: {
      title: input.title,
      body: input.body,
      status: input.publish ? "published" : "draft",
      // Keep the original publish date when re-editing something already live,
      // so supporters don't see it jump to the top of the list.
      publishedAt: input.publish ? (existing.publishedAt ?? new Date()) : null,
    },
  });
  return toRow(row);
}

export async function deleteCampaignUpdate(updateId: string, campaignId: string): Promise<void> {
  const existing = await prisma.campaignUpdate.findFirst({
    where: { id: updateId, campaignId },
    select: { id: true },
  });
  if (!existing) throw new UpdateError("That update wasn't found.", 404);
  await prisma.campaignUpdate.delete({ where: { id: updateId } });
}
