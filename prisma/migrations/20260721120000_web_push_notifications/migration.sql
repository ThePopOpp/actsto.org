-- Web Push (PWA) notifications: device subscriptions + Super Admin broadcast audit.

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions" ("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions" ("user_id");

CREATE TABLE IF NOT EXISTS "push_broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "body" text NOT NULL,
  "url" text,
  "audience" text NOT NULL DEFAULT 'all',
  "sent_by_email" text,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "push_broadcasts_created_at_idx" ON "push_broadcasts" ("created_at");

-- These tables are only accessed server-side via the Prisma/pg connection,
-- which bypasses RLS. Enable RLS (no permissive policies) so the Supabase
-- anon/authenticated PostgREST roles cannot read subscription endpoints.
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_broadcasts" ENABLE ROW LEVEL SECURITY;
