-- Block-based blog editor + reusable email templates.

-- Store the block-editor document alongside the rendered HTML.
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "blocks" jsonb;

CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "subject" text,
  "preheader" text,
  "content" text,
  "blocks" jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "source_blog_post_id" uuid,
  "created_by_email" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "email_templates_created_at_idx" ON "email_templates" ("created_at");

-- Server-only access via the Prisma/postgres role (bypasses RLS). Enable RLS with
-- no policies so the public PostgREST roles cannot read templates.
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
