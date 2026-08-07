-- The DashboardNotification model has existed for a long time but the table was
-- never created, so every query against it threw at runtime — invisible at build
-- time, and a 500 on the first page that read it.
--
-- Writes were all wrapped in `.catch(() => {})`, which is why nobody noticed:
-- in-app notifications have been silently discarded rather than failing loudly.

CREATE TABLE IF NOT EXISTS "dashboard_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "notification_type" TEXT,
  "read_at" TIMESTAMPTZ,
  "action_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dashboard_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "dashboard_notifications_user_id_created_at_idx"
  ON "dashboard_notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "dashboard_notifications_user_id_read_at_idx"
  ON "dashboard_notifications" ("user_id", "read_at");

-- Read through Prisma on the owner connection only.
ALTER TABLE "dashboard_notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "dashboard_notifications" FROM anon, authenticated;
