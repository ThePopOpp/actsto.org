-- Daily unique visitors per campaign page.
--
-- `visitor_hash` is a salted digest of IP + user agent + the date. It cannot be
-- reversed to a person and rotates at midnight, so this counts distinct
-- visitors without storing anything identifying. The unique index does the
-- de-duplication — a second visit on the same day is a no-op insert.

CREATE TABLE IF NOT EXISTS "campaign_page_views" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "viewed_on" DATE NOT NULL,
  "visitor_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_page_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_page_views_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_page_views_unique_visitor_day"
  ON "campaign_page_views" ("campaign_id", "viewed_on", "visitor_hash");
CREATE INDEX IF NOT EXISTS "campaign_page_views_campaign_id_viewed_on_idx"
  ON "campaign_page_views" ("campaign_id", "viewed_on");

-- Server-only: written through Prisma on the owner connection, never read by a
-- browser. RLS on with no policy denies everything else.
ALTER TABLE "campaign_page_views" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "campaign_page_views" FROM anon, authenticated;
