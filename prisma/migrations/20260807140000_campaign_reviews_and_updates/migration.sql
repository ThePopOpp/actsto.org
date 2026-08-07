-- Reviews on campaigns, and the family's switch to allow them.
--
-- The `reviews` table already existed but was never used and defaulted to
-- 'approved'. CLAUDE.md requires comments and reviews to be moderated by
-- default, so new reviews now start 'pending'.

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "reviews_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderation_note" TEXT;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS "reviews_campaign_id_status_idx" ON "reviews" ("campaign_id", "status");

-- The table had no foreign key to campaigns, so deleting a campaign left
-- reviews behind pointing at nothing.
DO $$ BEGIN
  ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
