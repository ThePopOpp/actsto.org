import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import {
  convertBlogToEmail,
  createEmailTemplate,
  listEmailTemplates,
  type EmailTemplateInput,
} from "@/lib/admin/email-templates";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const templates = await listEmailTemplates();
  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      preheader: t.preheader,
      status: t.status,
      content: t.content,
      blocks: t.blocks,
      sourceBlogPostId: t.sourceBlogPostId,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | (EmailTemplateInput & { sourceBlogPostId?: string })
    | null;

  try {
    // Convert-from-blog path.
    if (body?.sourceBlogPostId) {
      const template = await convertBlogToEmail(body.sourceBlogPostId, auth.email);
      return NextResponse.json({ template });
    }
    if (!body?.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const template = await createEmailTemplate(body, auth.email);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create email template." },
      { status: 400 },
    );
  }
}
