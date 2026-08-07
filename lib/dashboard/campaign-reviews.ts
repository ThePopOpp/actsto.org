import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Reviews supporters leave on a campaign.
 *
 * Moderated by default, per CLAUDE.md: a new review is `pending` and doesn't
 * appear publicly until the family (or an admin) approves it. That matters here
 * more than on a typical product — these sit on pages about children.
 */

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  authorName: string;
  authorPhoto: string | null;
};

export type ManagedReview = PublicReview & {
  status: string;
  authorEmail: string;
};

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/** Attach author details; reviews store only a profile id. */
async function withAuthors<T extends { donorId: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.donorId))];
  if (ids.length === 0) return new Map<string, { name: string; photo: string | null; email: string }>();

  const profiles = await prisma.profile
    .findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true, fullName: true, email: true, avatarUrl: true },
    })
    .catch(() => []);

  return new Map(
    profiles.map((p) => [
      p.id,
      {
        name: (p.displayName ?? p.fullName ?? p.email.split("@")[0] ?? "Supporter").trim(),
        photo: p.avatarUrl,
        email: p.email,
      },
    ]),
  );
}

/** Approved reviews for the public campaign page. */
export async function listPublicReviews(campaignId: string): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { campaignId, status: "approved" },
    orderBy: { createdAt: "desc" },
  });
  const authors = await withAuthors(rows);

  return rows.map((row) => {
    const author = authors.get(row.donorId);
    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? "",
      createdAt: row.createdAt.toISOString(),
      authorName: author?.name ?? "Supporter",
      authorPhoto: author?.photo ?? null,
    };
  });
}

/** Every review, including pending ones, for the family managing the campaign. */
export async function listManagedReviews(campaignId: string): Promise<ManagedReview[]> {
  const rows = await prisma.review.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
  const authors = await withAuthors(rows);

  return rows.map((row) => {
    const author = authors.get(row.donorId);
    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? "",
      createdAt: row.createdAt.toISOString(),
      status: row.status,
      authorName: author?.name ?? "Supporter",
      authorPhoto: author?.photo ?? null,
      authorEmail: author?.email ?? "",
    };
  });
}

export async function countApprovedReviews(campaignId: string): Promise<number> {
  return prisma.review.count({ where: { campaignId, status: "approved" } });
}

export function parseReviewInput(body: unknown): { rating: number; comment: string } {
  if (!body || typeof body !== "object") throw new ReviewError("Nothing to submit.", 400);
  const raw = body as Record<string, unknown>;

  const rating = Number(raw.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewError("Choose a rating from 1 to 5 stars.", 400);
  }

  const comment = typeof raw.comment === "string" ? raw.comment.trim() : "";
  if (!comment) throw new ReviewError("Write a few words about this campaign.", 400);
  if (comment.length > 4000) throw new ReviewError("That review is too long.", 400);

  return { rating, comment };
}

/**
 * Submit or replace a review. One per person per campaign — the unique index
 * enforces it, so re-reviewing edits the existing one rather than failing.
 *
 * An edit returns to `pending`: approved text must not be swappable for
 * something else after the fact.
 */
export async function submitReview(
  campaignId: string,
  donorId: string,
  input: { rating: number; comment: string },
) {
  return prisma.review.upsert({
    where: { campaignId_donorId: { campaignId, donorId } },
    create: { campaignId, donorId, rating: input.rating, comment: input.comment, status: "pending" },
    update: { rating: input.rating, comment: input.comment, status: "pending" },
  });
}

export async function moderateReview(
  reviewId: string,
  campaignId: string,
  status: "approved" | "rejected",
  note?: string | null,
) {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, campaignId },
    select: { id: true },
  });
  if (!existing) throw new ReviewError("That review wasn't found.", 404);

  return prisma.review.update({
    where: { id: reviewId },
    data: { status, moderationNote: note?.trim() || null },
  });
}

export async function setReviewsEnabled(campaignId: string, enabled: boolean) {
  return prisma.campaign.update({
    where: { id: campaignId },
    data: { reviewsEnabled: enabled },
  });
}
