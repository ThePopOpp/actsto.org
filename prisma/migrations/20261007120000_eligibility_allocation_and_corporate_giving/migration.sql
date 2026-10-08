-- Eligibility, allocation, caps and corporate giving (spec items #3, #4, #5,
-- #6, #7, #8, #9, #10, plus the 4-year retention rule).
--
-- Every rule that changes year to year (income table, caps) is a row, not a
-- constant. Every money movement after a donation (award, reversal,
-- disbursement) is its own row, so balances can always be rebuilt and audited.
--
-- Idempotent and re-runnable, like the migrations before it.

-- ── Donations: funding source ────────────────────────────────────────────────
-- One donation can fund more than one program: an individual's gift is
-- Original up to their Original limit and Overflow after that. A split row per
-- program, never a single column, so the dollars can be followed exactly.
CREATE TABLE IF NOT EXISTS "donation_fund_splits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "donation_id" UUID NOT NULL,
  "funding_source" TEXT NOT NULL,
  "amount" NUMERIC(14,2) NOT NULL,
  -- 'confirmed' when set by the donation form or an admin; 'needs_review' for
  -- backfilled rows an admin has not yet looked at.
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "set_by" UUID,
  "set_by_email" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "donation_fund_splits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donation_fund_splits_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations" ("id") ON DELETE CASCADE,
  CONSTRAINT "donation_fund_splits_source_check" CHECK ("funding_source" IN (
    'individual_original', 'individual_overflow', 'corporate_low_income',
    'corporate_disabled_displaced', 'corporate_other', 'unrestricted'
  )),
  CONSTRAINT "donation_fund_splits_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "donation_fund_splits_status_check" CHECK ("status" IN ('confirmed', 'needs_review'))
);
CREATE INDEX IF NOT EXISTS "donation_fund_splits_donation_id_idx" ON "donation_fund_splits" ("donation_id");
CREATE INDEX IF NOT EXISTS "donation_fund_splits_source_idx" ON "donation_fund_splits" ("funding_source");

-- Backfill: every paid donation gets a split. Nothing before today recorded a
-- program, so these are a best guess (individual Original, or the business
-- type's "corporate_other") marked needs_review for an admin to confirm.
INSERT INTO "donation_fund_splits" ("donation_id", "funding_source", "amount", "status", "note")
SELECT d."id",
       CASE WHEN d."donation_type" = 'business' THEN 'corporate_other' ELSE 'individual_original' END,
       COALESCE(d."total_amount", d."amount"),
       'needs_review',
       'Backfilled Oct 2026: no program was recorded when this gift was made.'
FROM "donations" d
WHERE d."status" = 'paid'
  AND COALESCE(d."total_amount", d."amount") > 0
  AND NOT EXISTS (SELECT 1 FROM "donation_fund_splits" s WHERE s."donation_id" = d."id");

-- Business details as the donor confirmed them on the corporate form. The EIN
-- is shown only to the donor and Super Admins, never publicly.
ALTER TABLE "donation_details" ADD COLUMN IF NOT EXISTS "business_name" TEXT;
ALTER TABLE "donation_details" ADD COLUMN IF NOT EXISTS "business_ein" TEXT;
ALTER TABLE "donation_details" ADD COLUMN IF NOT EXISTS "business_contact_title" TEXT;

-- ── Donor recommendations: one row per recommended student ───────────────────
-- donor_recommendations held a single student. A campaign can have several, and
-- the picker recommends all of them by default.
CREATE TABLE IF NOT EXISTS "donor_recommended_students" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "donation_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "donor_recommended_students_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donor_recommended_students_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations" ("id") ON DELETE CASCADE,
  CONSTRAINT "donor_recommended_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "donor_recommended_students_donation_student_key"
  ON "donor_recommended_students" ("donation_id", "student_id");
CREATE INDEX IF NOT EXISTS "donor_recommended_students_student_id_idx" ON "donor_recommended_students" ("student_id");

INSERT INTO "donor_recommended_students" ("donation_id", "student_id")
SELECT "donation_id", "recommended_student_id" FROM "donor_recommendations"
WHERE "recommended_student_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Low-income income table, per school year (#3) ────────────────────────────
-- rows: [{ "householdSize": 1, "base185": 29526, "maxIncome": 54623 }, ...]
CREATE TABLE IF NOT EXISTS "low_income_tables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_year" TEXT NOT NULL,
  "rows" JSONB NOT NULL DEFAULT '[]',
  "additional_base" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "additional_max" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "source_note" TEXT,
  "updated_by" UUID,
  "updated_by_email" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "low_income_tables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "low_income_tables_school_year_key" ON "low_income_tables" ("school_year");

-- 2026/27, confirmed by Scott on Oct 4, 2026. Household size 3 is $50,542 (one
-- circulated copy said $50,052, a typo).
INSERT INTO "low_income_tables" ("school_year", "rows", "additional_base", "additional_max", "source_note")
VALUES (
  '2026/2027',
  '[
    {"householdSize":1,"base185":29526,"maxIncome":54623},
    {"householdSize":2,"base185":40034,"maxIncome":74063},
    {"householdSize":3,"base185":50542,"maxIncome":93503},
    {"householdSize":4,"base185":61050,"maxIncome":112943},
    {"householdSize":5,"base185":71558,"maxIncome":132382},
    {"householdSize":6,"base185":82066,"maxIncome":151822},
    {"householdSize":7,"base185":92574,"maxIncome":171262},
    {"householdSize":8,"base185":103082,"maxIncome":190702}
  ]'::jsonb,
  10508,
  19440,
  'Entered from the 2026/27 table confirmed Oct 4, 2026. Verify against ADOR guidance (A.R.S. § 43-1504).'
)
ON CONFLICT ("school_year") DO NOTHING;

-- ── Scholarship caps, per fund, year and grade band (#10) ────────────────────
-- Caps limit what is SENT TO THE SCHOOL, not what is awarded.
CREATE TABLE IF NOT EXISTS "scholarship_caps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "funding_source" TEXT NOT NULL,
  "school_year" TEXT NOT NULL,
  -- 'k8' (K-8 and preschool with a disability) | '9_12'
  "grade_band" TEXT NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "updated_by" UUID,
  "updated_by_email" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "scholarship_caps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scholarship_caps_band_check" CHECK ("grade_band" IN ('k8', '9_12')),
  CONSTRAINT "scholarship_caps_amount_check" CHECK ("amount" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "scholarship_caps_source_year_band_key"
  ON "scholarship_caps" ("funding_source", "school_year", "grade_band");

INSERT INTO "scholarship_caps" ("funding_source", "school_year", "grade_band", "amount") VALUES
  ('corporate_low_income', '2024/2025', 'k8', 6300),
  ('corporate_low_income', '2024/2025', '9_12', 8100),
  ('corporate_low_income', '2025/2026', 'k8', 6500),
  ('corporate_low_income', '2025/2026', '9_12', 8300),
  ('corporate_low_income', '2026/2027', 'k8', 6700),
  ('corporate_low_income', '2026/2027', '9_12', 8500)
ON CONFLICT DO NOTHING;

-- ── Student eligibility flags (#3, #4) ───────────────────────────────────────
-- One row per student, flag and school year. Displaced status lasts all of
-- K-12, so it is stored once with school_year = 'K-12'.
CREATE TABLE IF NOT EXISTS "student_eligibility_flags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  -- 'low_income' | 'disabled' | 'displaced' | 'overflow'
  "flag" TEXT NOT NULL,
  "school_year" TEXT NOT NULL,
  -- 'pending_review' | 'awaiting_dcs' | 'info_requested' | 'approved' | 'denied' | 'revoked'
  "status" TEXT NOT NULL DEFAULT 'pending_review',
  -- 'application' | 'verification' | 'admin_override'
  "source" TEXT NOT NULL,
  "source_application_id" UUID,
  "verification_id" UUID,
  "document_id" UUID,
  -- What the decision rested on: the income calculation, or what a document showed.
  "details" JSONB NOT NULL DEFAULT '{}',
  "decided_by" UUID,
  "decided_at" TIMESTAMPTZ,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "student_eligibility_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_eligibility_flags_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE,
  CONSTRAINT "student_eligibility_flags_flag_check" CHECK ("flag" IN ('low_income', 'disabled', 'displaced', 'overflow')),
  CONSTRAINT "student_eligibility_flags_status_check" CHECK ("status" IN (
    'pending_review', 'awaiting_dcs', 'info_requested', 'approved', 'denied', 'revoked'
  ))
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_eligibility_flags_student_flag_year_key"
  ON "student_eligibility_flags" ("student_id", "flag", "school_year");
CREATE INDEX IF NOT EXISTS "student_eligibility_flags_flag_status_idx"
  ON "student_eligibility_flags" ("flag", "status", "school_year");

-- Append-only history: every change to a flag, who made it and why.
CREATE TABLE IF NOT EXISTS "student_eligibility_flag_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "flag_id" UUID NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "actor_id" UUID,
  "actor_email" TEXT,
  "reason" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "student_eligibility_flag_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_eligibility_flag_events_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "student_eligibility_flags" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "student_eligibility_flag_events_flag_id_idx"
  ON "student_eligibility_flag_events" ("flag_id", "created_at");

-- Overflow findings already verified at approval carry over as flags.
INSERT INTO "student_eligibility_flags"
  ("student_id", "flag", "school_year", "status", "source", "source_application_id", "details", "decided_by", "decided_at")
SELECT "student_id", 'overflow', "school_year",
       CASE WHEN "revoked_at" IS NULL THEN 'approved' ELSE 'revoked' END,
       'application', "source_application_id",
       jsonb_build_object('qualification', "overflow_qualification"),
       "verified_by", "verified_at"
FROM "student_year_eligibility"
WHERE "overflow_eligible" = true
ON CONFLICT DO NOTHING;

-- ── Disability and displacement verification (#4) ───────────────────────────
CREATE TABLE IF NOT EXISTS "student_verifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  -- 'disability' | 'displacement'
  "kind" TEXT NOT NULL,
  -- The school year for disability; 'K-12' for displacement (verified once).
  "school_year" TEXT NOT NULL,
  -- 'pending_review' | 'awaiting_dcs' | 'info_requested' | 'approved' | 'denied' | 'withdrawn'
  "status" TEXT NOT NULL DEFAULT 'pending_review',
  -- 'profile' | 'application'
  "source" TEXT NOT NULL DEFAULT 'profile',
  "source_application_id" UUID,
  "requested_by" UUID,
  "parent_note" TEXT,
  "claimed_by" UUID,
  "claimed_at" TIMESTAMPTZ,
  "dcs_sent_at" TIMESTAMPTZ,
  "dcs_reference" TEXT,
  -- What the document showed, recorded by the reviewer. Kept after the file is purged.
  "document_summary" TEXT,
  "decided_by" UUID,
  "decided_at" TIMESTAMPTZ,
  "parent_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "student_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_verifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE,
  CONSTRAINT "student_verifications_kind_check" CHECK ("kind" IN ('disability', 'displacement')),
  CONSTRAINT "student_verifications_status_check" CHECK ("status" IN (
    'pending_review', 'awaiting_dcs', 'info_requested', 'approved', 'denied', 'withdrawn'
  ))
);
CREATE INDEX IF NOT EXISTS "student_verifications_student_id_idx" ON "student_verifications" ("student_id");
CREATE INDEX IF NOT EXISTS "student_verifications_status_idx" ON "student_verifications" ("status");

-- Append-only, like application_reviews.
CREATE TABLE IF NOT EXISTS "verification_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "verification_id" UUID NOT NULL,
  "reviewer_id" UUID,
  "reviewer_email" TEXT,
  -- 'submit' | 'claim' | 'send_to_dcs' | 'approve' | 'deny' | 'request_info' | 'note' | 'parent_upload'
  "action" TEXT NOT NULL,
  "internal_note" TEXT,
  "parent_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "verification_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "verification_reviews_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "student_verifications" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "verification_reviews_verification_id_idx" ON "verification_reviews" ("verification_id", "created_at");

-- Verification files live beside application files: same private bucket, same
-- access log, same View document button.
ALTER TABLE "application_documents" ALTER COLUMN "application_id" DROP NOT NULL;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "verification_id" UUID;
DO $$ BEGIN
  ALTER TABLE "application_documents"
    ADD CONSTRAINT "application_documents_verification_id_fkey"
    FOREIGN KEY ("verification_id") REFERENCES "student_verifications" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "application_documents_verification_id_idx" ON "application_documents" ("verification_id");

-- Retention: a hold blocks the purge during an audit or dispute, and displaced
-- forms have no date until the final payout year is known.
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "legal_hold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "legal_hold_reason" TEXT;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "retention_rule" TEXT NOT NULL DEFAULT 'award_year_4y';
ALTER TABLE "application_documents" ALTER COLUMN "purge_after" DROP NOT NULL;

-- Existing files were dated 24 months from upload. Move them to the 4-year rule:
-- September 30 after the award year ends, plus four years.
UPDATE "application_documents" d
SET "purge_after" = GREATEST(
  d."purge_after",
  make_date(split_part(a."school_year", '/', 1)::int + 5, 9, 30)
)
FROM "scholarship_applications" a
WHERE a."id" = d."application_id"
  AND d."purged_at" IS NULL
  AND a."school_year" ~ '^\d{4}/';

-- ── Application: circumstances and income proof (#3, #4) ─────────────────────
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "has_disability" TEXT;
-- True when the yes came from picking a disability overflow reason, so it can be
-- switched back if the parent changes that reason without touching the question.
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "disability_auto_set" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "is_displaced" TEXT;
-- 'not_provided' | 'submitted' | 'accepted' | 'rejected' | 'needs_more'
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_proof_status" TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_proof_decided_by" UUID;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_proof_decided_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_proof_note" TEXT;

-- Applications that already claimed a disability get the yes they implied.
UPDATE "scholarship_applications"
SET "has_disability" = 'yes', "disability_auto_set" = true
WHERE "overflow_qualification" IN ('disability', 'preschool') AND "has_disability" IS NULL;

-- ── Awards and disbursements (#5) ────────────────────────────────────────────
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "funding_source" TEXT;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "donation_id" UUID;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "created_by_email" TEXT;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "held_reason" TEXT;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "hold_released_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "hold_released_by" UUID;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "hold_release_note" TEXT;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "reversed_by" UUID;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "reversal_reason" TEXT;
-- 'awarded' | 'held_esa' | 'reversed'
ALTER TABLE "scholarship_awards" ALTER COLUMN "status" SET DEFAULT 'awarded';
DO $$ BEGIN
  ALTER TABLE "scholarship_awards"
    ADD CONSTRAINT "scholarship_awards_donation_id_fkey"
    FOREIGN KEY ("donation_id") REFERENCES "donations" ("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "scholarship_awards_student_year_idx" ON "scholarship_awards" ("student_id", "school_year");
CREATE INDEX IF NOT EXISTS "scholarship_awards_source_idx" ON "scholarship_awards" ("funding_source", "school_year");
CREATE INDEX IF NOT EXISTS "scholarship_awards_campaign_idx" ON "scholarship_awards" ("campaign_id");

ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "recorded_by" UUID;
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "recorded_by_email" TEXT;
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "voided_by" UUID;
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "void_reason" TEXT;
CREATE INDEX IF NOT EXISTS "scholarship_payments_award_id_idx" ON "scholarship_payments" ("award_id");

-- Per-student, per-year limits an admin enters: a tuition ceiling override and
-- the disabled/displaced cap (lesser of tuition or 90% of state aid).
CREATE TABLE IF NOT EXISTS "student_year_limits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "school_year" TEXT NOT NULL,
  "tuition_ceiling" NUMERIC(12,2),
  "tuition_reason" TEXT,
  "dd_cap" NUMERIC(12,2),
  "dd_cap_reason" TEXT,
  "dd_cap_document_id" UUID,
  "updated_by" UUID,
  "updated_by_email" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "student_year_limits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_year_limits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_year_limits_student_year_key" ON "student_year_limits" ("student_id", "school_year");

-- ── Campaigns: school-level type, awarded totals, featured rank (#6, #7, #9) ──
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "is_school_level" BOOLEAN NOT NULL DEFAULT false;
-- Awarded = active awards to the campaign's students drawn from this campaign's
-- donations. Recomputed whenever an award changes; raised_amount stays as the
-- donations-received figure for admins.
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "awarded_amount" NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "awarded_donor_count" INTEGER NOT NULL DEFAULT 0;
-- Lower ranks show first among featured campaigns. Null means not pinned.
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "featured_rank" INTEGER;

-- Convert placeholder-student campaigns ("Greatest Need") to school-level
-- campaigns. Donations keep their campaign link, so nothing raised is lost.
WITH placeholder AS (
  SELECT cs."campaign_id", cs."student_id", s."school_id"
  FROM "campaign_students" cs
  JOIN "students" s ON s."id" = cs."student_id"
  WHERE lower(trim(concat_ws(' ', s."first_name", s."last_name"))) = 'greatest need'
)
UPDATE "campaigns" c
SET "is_school_level" = true,
    "school_id" = COALESCE(c."school_id", p."school_id")
FROM placeholder p
WHERE c."id" = p."campaign_id";

UPDATE "donor_recommendations" r
SET "recommended_student_id" = NULL
FROM "students" s
WHERE r."recommended_student_id" = s."id"
  AND lower(trim(concat_ws(' ', s."first_name", s."last_name"))) = 'greatest need';

DELETE FROM "donor_recommended_students" drs
USING "students" s
WHERE drs."student_id" = s."id"
  AND lower(trim(concat_ws(' ', s."first_name", s."last_name"))) = 'greatest need';

DELETE FROM "campaign_students" cs
USING "students" s
WHERE cs."student_id" = s."id"
  AND lower(trim(concat_ws(' ', s."first_name", s."last_name"))) = 'greatest need';

UPDATE "students"
SET "status" = 'archived'
WHERE lower(trim(concat_ws(' ', "first_name", "last_name"))) = 'greatest need';

-- ── Business profile logo ────────────────────────────────────────────────────
ALTER TABLE "business_donor_profiles" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;

-- ── Grades: one shared list (Preschool, Kindergarten, 1st grade … 12th grade) ─
-- Common free-text variants map to the list. Anything else is left as typed and
-- shows on the admin grade review list rather than being guessed at.
CREATE OR REPLACE FUNCTION pg_temp.canonical_grade(raw text) RETURNS text AS $$
DECLARE
  v text := lower(regexp_replace(trim(coalesce(raw, '')), '\s+', ' ', 'g'));
  n int;
BEGIN
  IF v = '' THEN RETURN NULL; END IF;
  IF v ~ '^(pre-?k|pre-?school|pk|pre-?kindergarten|tk)$' THEN RETURN 'Preschool'; END IF;
  IF v ~ '^(k|kg|kinder|kindergarten|kindergarden)$' THEN RETURN 'Kindergarten'; END IF;
  IF v ~ '^(grade )?\d{1,2}(st|nd|rd|th)?( grade)?$' THEN
    n := substring(v from '\d{1,2}')::int;
    IF n BETWEEN 1 AND 12 THEN
      RETURN n || CASE WHEN n = 1 THEN 'st' WHEN n = 2 THEN 'nd' WHEN n = 3 THEN 'rd' ELSE 'th' END || ' grade';
    END IF;
  END IF;
  RETURN raw;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "students" SET "grade" = pg_temp.canonical_grade("grade")
WHERE "grade" IS NOT NULL AND "grade" IS DISTINCT FROM pg_temp.canonical_grade("grade");

UPDATE "scholarship_applications" SET "grade" = pg_temp.canonical_grade("grade")
WHERE "grade" IS NOT NULL AND "grade" IS DISTINCT FROM pg_temp.canonical_grade("grade");

-- ── Accounts still marked "invited" after their owner has signed in ──────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE "profiles" p SET "status" = 'active'
    FROM auth.users u
    WHERE u.id = p."id" AND p."status" = 'invited' AND u.last_sign_in_at IS NOT NULL;
  END IF;
END $$;

-- ── Lock down: server-only tables, reached through Prisma ────────────────────
DO $$
DECLARE
  t text;
  locked text[] := ARRAY[
    'donation_fund_splits',
    'donor_recommended_students',
    'low_income_tables',
    'scholarship_caps',
    'student_eligibility_flags',
    'student_eligibility_flag_events',
    'student_verifications',
    'verification_reviews',
    'student_year_limits'
  ];
BEGIN
  FOREACH t IN ARRAY locked LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
