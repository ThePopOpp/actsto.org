-- Oct 12 site review fixes. Every statement is re-runnable.

-- ── Schools: featured image and photo gallery ───────────────────────────────
-- Families adding a school under "Other school", and staff on the Schools
-- screen or CSV import, can give a school its photos as well as its logo.
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "featured_image_url" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gallery_urls" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── Removed test donations ──────────────────────────────────────────────────
-- Super Admins can remove test donations from Payments. Before a donation and
-- its receipts, PayPal records and allocations are deleted, a full copy goes
-- here, so a removal can be traced or restored by hand.
CREATE TABLE IF NOT EXISTS "removed_test_donations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "donation_id" UUID NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "status" TEXT NOT NULL,
  "donation_type" TEXT NOT NULL,
  "donation_created_at" TIMESTAMPTZ NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "removed_by" UUID,
  "removed_by_email" TEXT,
  "removed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "removed_test_donations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "removed_test_donations_donation_id_idx" ON "removed_test_donations" ("donation_id");

-- Server-only, like the other money tables: no browser access.
ALTER TABLE "removed_test_donations" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.removed_test_donations FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.removed_test_donations FROM authenticated';
  END IF;
END $$;

-- ── Valley Christian campaign text ──────────────────────────────────────────
-- 20261011120000 fixed the tagline; the description and excerpt carried the
-- same "scholarships for student at" wording. Exact phrase only.
UPDATE "campaigns"
SET "story" = regexp_replace("story", '(?i)(scholarships for )student at', '\1students at', 'g')
WHERE "story" ~* 'scholarships for student at';

UPDATE "campaigns"
SET "short_excerpt" = regexp_replace("short_excerpt", '(?i)(scholarships for )student at', '\1students at', 'g')
WHERE "short_excerpt" ~* 'scholarships for student at';

-- ── Payton Duran attends Valley Christian Schools ───────────────────────────
-- Left showing "No school" after the school merge. Set from the review.
WITH vcs AS (
  SELECT "id"
  FROM "schools"
  WHERE "status" <> 'archived' AND "name" ILIKE 'valley christian school%'
  ORDER BY ("status" = 'active') DESC, "created_at" ASC
  LIMIT 1
)
UPDATE "students" s
SET "school_id" = vcs."id", "updated_at" = now()
FROM vcs
WHERE lower(trim(s."first_name")) = 'payton'
  AND lower(trim(coalesce(s."last_name", ''))) = 'duran'
  AND s."school_id" IS DISTINCT FROM vcs."id";

-- ── Every student gets the school their family already named ────────────────
-- A student added on the Students page had no school field, and merges moved
-- applications but not school-less students. Fill a missing school from the
-- latest application that names one, then from a campaign. Never changes a
-- school that is already set. (Same rule as lib/schools/student-school.ts.)
UPDATE "students" s
SET "school_id" = latest."school_id", "updated_at" = now()
FROM (
  SELECT DISTINCT ON (a."student_id") a."student_id", a."school_id"
  FROM "scholarship_applications" a
  JOIN "schools" sc ON sc."id" = a."school_id" AND sc."status" <> 'archived'
  WHERE a."school_id" IS NOT NULL
  ORDER BY a."student_id", a."updated_at" DESC
) latest
WHERE s."id" = latest."student_id" AND s."school_id" IS NULL;

UPDATE "students" s
SET "school_id" = latest."school_id", "updated_at" = now()
FROM (
  SELECT DISTINCT ON (cs."student_id") cs."student_id", c."school_id"
  FROM "campaign_students" cs
  JOIN "campaigns" c ON c."id" = cs."campaign_id"
  JOIN "schools" sc ON sc."id" = c."school_id" AND sc."status" <> 'archived'
  WHERE c."school_id" IS NOT NULL
  ORDER BY cs."student_id", c."updated_at" DESC
) latest
WHERE s."id" = latest."student_id" AND s."school_id" IS NULL;
