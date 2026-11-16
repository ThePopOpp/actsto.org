-- Private donor proposals with a link-only landing page (first: the Musk
-- Scholars Fund). Nov 16, 2026. Copy lives in code; these rows hold the
-- secret link token, the on/off switch, the signer, and daily unique views.
--
-- Re-runnable: every step checks before it changes anything.

CREATE TABLE IF NOT EXISTS "donor_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "signer_name" TEXT,
    "signer_title" TEXT,
    "signer_phone" TEXT,
    "signer_email" TEXT,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "donor_proposals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "donor_proposals_key_key" ON "donor_proposals"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "donor_proposals_token_key" ON "donor_proposals"("token");

CREATE TABLE IF NOT EXISTS "donor_proposal_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "viewed_on" DATE NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "referrer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donor_proposal_views_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "donor_proposal_views_unique_daily"
  ON "donor_proposal_views"("proposal_id", "viewed_on", "visitor_hash");
CREATE INDEX IF NOT EXISTS "donor_proposal_views_day_idx"
  ON "donor_proposal_views"("proposal_id", "viewed_on");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donor_proposal_views_proposal_id_fkey') THEN
    ALTER TABLE "donor_proposal_views"
      ADD CONSTRAINT "donor_proposal_views_proposal_id_fkey"
      FOREIGN KEY ("proposal_id") REFERENCES "donor_proposals"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Reached only through Prisma on the owner connection. RLS on with no
-- policies keeps the browser's anon key away from the token and the signer.
ALTER TABLE "donor_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "donor_proposal_views" ENABLE ROW LEVEL SECURITY;
