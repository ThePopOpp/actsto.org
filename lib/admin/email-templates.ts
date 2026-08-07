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
