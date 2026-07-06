CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pledge_id" uuid NOT NULL REFERENCES "pledges"("id"),
  "donation_id" uuid REFERENCES "donations"("id"),
  "invoice_number" text NOT NULL UNIQUE,
  "issued_date" date NOT NULL,
  "due_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "line_items" jsonb NOT NULL DEFAULT '[]',
  "subtotal" numeric(14,2) NOT NULL,
  "tax_rate_percent" numeric(5,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "total" numeric(14,2) NOT NULL,
  "notes" text,
  "paid_at" timestamptz,
  "created_by_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "invoices_pledge_id_idx" ON "invoices" ("pledge_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'draft',
  "scheduled_at" timestamptz,
  "excerpt" text,
  "content" text,
  "featured_image_url" text,
  "featured_image_alt" text,
  "categories" text,
  "tags" text,
  "author_name" text,
  "seo_title" text,
  "seo_description" text,
  "canonical_url" text,
  "focus_keyword" text,
  "published_at" timestamptz,
  "created_by_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" ("status");

ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "shepard_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" uuid NOT NULL,
  "title" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shepard_conversations_admin_user_id_idx" ON "shepard_conversations" ("admin_user_id");

ALTER TABLE "shepard_conversations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "shepard_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "shepard_conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text,
  "tool_calls_json" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shepard_messages_conversation_id_idx" ON "shepard_messages" ("conversation_id");

ALTER TABLE "shepard_messages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "shepard_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "shepard_conversations"("id") ON DELETE CASCADE,
  "message_id" uuid NOT NULL REFERENCES "shepard_messages"("id") ON DELETE CASCADE,
  "tool_name" text NOT NULL,
  "args_json" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "result_json" jsonb,
  "executed_by_user_id" uuid,
  "executed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shepard_actions_conversation_id_idx" ON "shepard_actions" ("conversation_id");
CREATE INDEX IF NOT EXISTS "shepard_actions_status_idx" ON "shepard_actions" ("status");

ALTER TABLE "shepard_actions" ENABLE ROW LEVEL SECURITY;
