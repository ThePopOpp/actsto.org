import "server-only";

import { blocksToHtml, coerceBlocks, type BlogBlock } from "@/lib/blog/blocks";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import { prisma } from "@/lib/prisma";

export type EmailTemplateInput = {
  title: string;
  subject?: string | null;
  preheader?: string | null;
  status?: string;
  blocks?: BlogBlock[] | null;
  content?: string | null;
  /** Hero block. Rendered by the shared layout above the body. */
  eyebrow?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  featuredImageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  catalogKey?: string | null;
  category?: string | null;
  audienceRole?: string | null;
};

/**
 * Renders a template to the complete, sendable email.
 *
 * `content` is what the compose panel puts on the wire, so it has to be the
 * finished article — masthead, hero, featured photo, signature, footer and all.
 * It used to be a bare 600px white box around the body blocks, which meant
 * every template sent from here arrived unbranded. Going through
 * `renderEmailLayout` is what makes the editor, the preview and the send agree.
 */
function resolveEmailContent(input: EmailTemplateInput): { blocks: BlogBlock[]; content: string } {
  const blocks = coerceBlocks(input.blocks);
  const inner = blocks.length ? blocksToHtml(blocks) : input.content ?? "";
  const content = renderEmailLayout({
    preheader: input.preheader ?? input.subject ?? "",
    eyebrow: input.eyebrow ?? undefined,
    // Falls back through the subject to the internal title, so a template
    // nobody has filled in still renders a readable hero.
    title: input.heroTitle || input.subject || input.title,
    subtitle: input.heroSubtitle ?? undefined,
    featuredImageUrl: input.featuredImageUrl ?? null,
    featuredImageAlt: input.heroTitle ?? input.title,
    // The greeting is part of the shell. Merge fields are substituted by the
    // sender, so leaving the token here is correct.
    firstName: "{{first_name}}",
    bodyHtml: inner,
    cta:
      input.ctaLabel && input.ctaUrl
        ? { label: input.ctaLabel, url: input.ctaUrl }
        : undefined,
    showUnsubscribe: true,
  });
  return { blocks, content };
}

/** Every hero/catalogue column, for the create and update writes. */
function metaFields(input: EmailTemplateInput) {
  return {
    eyebrow: input.eyebrow ?? null,
    heroTitle: input.heroTitle ?? null,
    heroSubtitle: input.heroSubtitle ?? null,
    featuredImageUrl: input.featuredImageUrl ?? null,
    ctaLabel: input.ctaLabel ?? null,
    ctaUrl: input.ctaUrl ?? null,
  };
}

export async function listEmailTemplates() {
  return prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getEmailTemplateById(id: string) {
  return prisma.emailTemplate.findUnique({ where: { id } });
}

export async function createEmailTemplate(input: EmailTemplateInput, createdByEmail: string) {
  const { blocks, content } = resolveEmailContent(input);
  return prisma.emailTemplate.create({
    data: {
      title: input.title || "Untitled email",
      subject: input.subject ?? null,
      preheader: input.preheader ?? null,
      status: input.status ?? "draft",
      blocks,
      content,
      ...metaFields(input),
      catalogKey: input.catalogKey ?? null,
      category: input.category ?? null,
      audienceRole: input.audienceRole ?? null,
      createdByEmail,
    },
  });
}

export async function updateEmailTemplate(id: string, input: EmailTemplateInput) {
  const { blocks, content } = resolveEmailContent(input);
  return prisma.emailTemplate.update({
    where: { id },
    data: {
      title: input.title || "Untitled email",
      subject: input.subject ?? null,
      preheader: input.preheader ?? null,
      status: input.status ?? "draft",
      blocks,
      content,
      ...metaFields(input),
    },
  });
}

export async function deleteEmailTemplate(id: string) {
  return prisma.emailTemplate.delete({ where: { id } });
}

/** Convert an existing blog post into a reusable email template. */
export async function convertBlogToEmail(blogPostId: string, createdByEmail: string) {
  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  if (!post) throw new Error("Blog post not found.");
  const blocks = coerceBlocks(post.blocks);
  const inner = blocks.length ? blocksToHtml(blocks) : post.content ?? "";
  const { content } = resolveEmailContent({
    title: post.title,
    subject: post.title,
    preheader: post.excerpt,
    heroTitle: post.title,
    heroSubtitle: post.excerpt,
    featuredImageUrl: post.featuredImageUrl ?? null,
    blocks,
    content: inner,
  });
  return prisma.emailTemplate.create({
    data: {
      title: `Email: ${post.title}`,
      subject: post.title,
      preheader: post.excerpt ?? null,
      status: "draft",
      blocks,
      content,
      sourceBlogPostId: post.id,
      createdByEmail,
    },
  });
}

// ── Bulk operations ──────────────────────────────────────────────────────────

/** The three states a template can be in. `ready` is what "publish" means here. */
export const EMAIL_TEMPLATE_STATUSES = ["draft", "ready", "archived"] as const;
export type EmailTemplateStatus = (typeof EMAIL_TEMPLATE_STATUSES)[number];

export function isEmailTemplateStatus(value: unknown): value is EmailTemplateStatus {
  return typeof value === "string" && (EMAIL_TEMPLATE_STATUSES as readonly string[]).includes(value);
}

/**
 * Move templates between draft, ready and archived.
 *
 * Deliberately does not go through `updateEmailTemplate`: that re-renders
 * `content` from the stored blocks, so a status change would silently rewrite
 * the email body. Changing what state something is in should not change what
 * it says.
 */
export async function setEmailTemplatesStatus(ids: string[], status: EmailTemplateStatus) {
  if (ids.length === 0) return 0;
  const result = await prisma.emailTemplate.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  return result.count;
}

export async function deleteEmailTemplates(ids: string[]) {
  if (ids.length === 0) return 0;
  const result = await prisma.emailTemplate.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

/**
 * Copy templates, one new draft per source.
 *
 * `catalog_key` is unique and ties a row to a catalogue entry that the app
 * sends automatically, so a copy must not carry it — two rows claiming the same
 * trigger would be ambiguous even if the database allowed it. The copy is
 * always a draft, whatever the original was, so duplicating something live
 * cannot put an unreviewed second copy into circulation.
 */
export async function duplicateEmailTemplates(ids: string[], createdByEmail: string) {
  if (ids.length === 0) return { created: 0 };

  const sources = await prisma.emailTemplate.findMany({ where: { id: { in: ids } } });
  if (sources.length === 0) return { created: 0 };

  const existingTitles = new Set(
    (await prisma.emailTemplate.findMany({ select: { title: true } })).map((t) => t.title),
  );

  /** "Welcome" -> "Welcome (copy)" -> "Welcome (copy 2)" … */
  function uniqueTitle(base: string) {
    let candidate = `${base} (copy)`;
    let n = 2;
    while (existingTitles.has(candidate)) {
      candidate = `${base} (copy ${n})`;
      n += 1;
    }
    existingTitles.add(candidate);
    return candidate;
  }

  const created = await prisma.emailTemplate.createMany({
    data: sources.map((source) => ({
      title: uniqueTitle(source.title),
      subject: source.subject,
      preheader: source.preheader,
      catalogKey: null,
      category: source.category,
      audienceRole: source.audienceRole,
      eyebrow: source.eyebrow,
      heroTitle: source.heroTitle,
      heroSubtitle: source.heroSubtitle,
      featuredImageUrl: source.featuredImageUrl,
      ctaLabel: source.ctaLabel,
      ctaUrl: source.ctaUrl,
      content: source.content,
      blocks: source.blocks ?? undefined,
      status: "draft",
      sourceBlogPostId: source.sourceBlogPostId,
      createdByEmail,
    })),
  });

  return { created: created.count };
}
