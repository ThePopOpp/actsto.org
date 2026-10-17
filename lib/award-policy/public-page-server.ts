import "server-only";

import DOMPurify from "isomorphic-dompurify";

import { logAdminActivity } from "@/lib/admin/audit";
import { AWARD_SUMMARY_SLUG, AWARD_SUMMARY_STARTER_HTML, AWARD_SUMMARY_TITLE } from "@/lib/award-policy/public-page";
import { prisma } from "@/lib/prisma";

export type PageVersion = {
  id: string;
  title: string;
  bodyHtml: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

function toView(v: {
  id: string;
  title: string;
  bodyHtml: string;
  status: string;
  publishedAt: Date | null;
  createdByEmail: string | null;
  createdAt: Date;
}): PageVersion {
  return {
    id: v.id,
    title: v.title,
    bodyHtml: v.bodyHtml,
    status: v.status === "published" ? "published" : "draft",
    publishedAt: v.publishedAt?.toISOString() ?? null,
    createdByEmail: v.createdByEmail,
    createdAt: v.createdAt.toISOString(),
  };
}

/** What the public sees: the newest published version, or null before the first publish. */
export async function publishedAwardSummary(): Promise<PageVersion | null> {
  const v = await prisma.publicPageVersion
    .findFirst({ where: { slug: AWARD_SUMMARY_SLUG, status: "published" }, orderBy: { publishedAt: "desc" } })
    .catch(() => null);
  return v ? toView(v) : null;
}

/** For the editor: the newest version (draft or published), the published one, and the history. */
export async function awardSummaryForEditor() {
  const versions = await prisma.publicPageVersion.findMany({
    where: { slug: AWARD_SUMMARY_SLUG },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const latest = versions[0] ? toView(versions[0]) : null;
  const published = versions.find((v) => v.status === "published");
  return {
    latest: latest ?? {
      id: "",
      title: AWARD_SUMMARY_TITLE,
      bodyHtml: AWARD_SUMMARY_STARTER_HTML,
      status: "draft" as const,
      publishedAt: null,
      createdByEmail: null,
      createdAt: new Date(0).toISOString(),
    },
    published: published ? toView(published) : null,
    history: versions.map((v) => ({ id: v.id, status: v.status, title: v.title, createdAt: v.createdAt.toISOString(), createdByEmail: v.createdByEmail, publishedAt: v.publishedAt?.toISOString() ?? null })),
  };
}

export async function getAwardSummaryVersion(id: string) {
  const v = await prisma.publicPageVersion.findUnique({ where: { id } });
  return v && v.slug === AWARD_SUMMARY_SLUG ? toView(v) : null;
}

/**
 * Save a new version. Every save is kept, so the text in force on any date can
 * be found. Publishing makes it the public page immediately, with no deploy.
 */
export async function saveAwardSummary(
  actor: { id: string | null; email: string },
  input: { title: string; bodyHtml: string; publish: boolean },
) {
  const title = input.title.trim().slice(0, 200) || AWARD_SUMMARY_TITLE;
  const bodyHtml = DOMPurify.sanitize(input.bodyHtml ?? "", { USE_PROFILES: { html: true } }).slice(0, 200_000);
  if (!bodyHtml.trim()) throw new Error("The page is empty.");
  const now = new Date();
  const version = await prisma.publicPageVersion.create({
    data: {
      slug: AWARD_SUMMARY_SLUG,
      title,
      bodyHtml,
      status: input.publish ? "published" : "draft",
      publishedAt: input.publish ? now : null,
      createdBy: actor.id,
      createdByEmail: actor.email,
    },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: input.publish ? "award_summary.publish" : "award_summary.save_draft",
    entityType: "public_page",
    entityId: version.id,
    after: { slug: AWARD_SUMMARY_SLUG, title },
  });
  return toView(version);
}

/** Take the page down (it shows the holding text) without losing any version. */
export async function unpublishAwardSummary(actor: { id: string | null; email: string }) {
  const result = await prisma.publicPageVersion.updateMany({
    where: { slug: AWARD_SUMMARY_SLUG, status: "published" },
    data: { status: "draft" },
  });
  await logAdminActivity({ actorId: actor.id, actorEmail: actor.email, action: "award_summary.unpublish", entityType: "public_page", after: { versions: result.count } });
}
