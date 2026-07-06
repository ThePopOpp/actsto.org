-- Super Admin sessions expose an email, not a stable auth.users UUID (see ActSession /
-- requireSuperAdminApi), so these "who did this" columns are corrected to store email instead.
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "created_by_user_id";
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_by_email" text;

ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "created_by_user_id";
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "created_by_email" text;

ALTER TABLE "shepard_conversations" DROP COLUMN IF EXISTS "admin_user_id";
ALTER TABLE "shepard_conversations" ADD COLUMN IF NOT EXISTS "admin_email" text NOT NULL DEFAULT '';
ALTER TABLE "shepard_conversations" ALTER COLUMN "admin_email" DROP DEFAULT;

ALTER TABLE "shepard_actions" DROP COLUMN IF EXISTS "executed_by_user_id";
ALTER TABLE "shepard_actions" ADD COLUMN IF NOT EXISTS "executed_by_email" text;

DROP INDEX IF EXISTS "shepard_conversations_admin_user_id_idx";
CREATE INDEX IF NOT EXISTS "shepard_conversations_admin_email_idx" ON "shepard_conversations" ("admin_email");
