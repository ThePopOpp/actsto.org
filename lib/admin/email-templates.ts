import "server-only";

import { blocksToHtml, coerceBlocks, type BlogBlock } from "@/lib/blog/blocks";
import { prisma } from "@/lib/prisma";

export type EmailTemplateInput = {
  title: string;
  subject?: string | null;
  preheader?: string | null;
  status?: string;
  blocks?: BlogBlock[] | null;
  content?: string | null;
};

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wrap block HTML in a 600px, inline-styled email shell (client-friendly). */
export function wrapEmailHtml(inner: string, opts?: { preheader?: string | null }) {
  const pre = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeText(opts.preheader)}</div>`
    : "";
  return `<div style="background:#f5fbff;padding:24px 12px;">${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;padding:28px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td>${inner}</td></tr></table></td></tr></table></div>`;
}

function resolveEmailContent(input: EmailTemplateInput): { blocks: BlogBlock[]; content: string } {
  const blocks = coerceBlocks(input.blocks);
  const inner = blocks.length ? blocksToHtml(blocks) : input.content ?? "";
  return { blocks, content: wrapEmailHtml(inner, { preheader: input.preheader }) };
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
  const content = wrapEmailHtml(inner, { preheader: post.excerpt });
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
