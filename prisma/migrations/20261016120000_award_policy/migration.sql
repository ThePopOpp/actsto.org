-- Scholarship Award Policy (Oct 16, 2026): disability verified once, the
-- 90%-of-state-aid matrix, ESA status per year, other STOs' scholarships,
-- returns from schools, award decision records, the Overflow waiting list,
-- the public award summary page and the private policy document. Re-runnable.

-- AlterTable
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "other_sto_answer" TEXT;

-- AlterTable
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "decision_id" UUID;

-- AlterTable
ALTER TABLE "scholarship_payments" ADD COLUMN IF NOT EXISTS "return_note" TEXT,
ADD COLUMN IF NOT EXISTS "returned_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "returned_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "tuition_override_reason" TEXT;

-- AlterTable
ALTER TABLE "student_year_limits" ADD COLUMN IF NOT EXISTS "dd_cap_is_override" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_verifications" ADD COLUMN IF NOT EXISTS "disability_named" TEXT,
ADD COLUMN IF NOT EXISTS "document_type" TEXT,
ADD COLUMN IF NOT EXISTS "grade_band" TEXT,
ADD COLUMN IF NOT EXISTS "is_update" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "issued_by_az_public" BOOLEAN,
ADD COLUMN IF NOT EXISTS "sped_category" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "dd_cap_matrix_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_year" TEXT NOT NULL,
    "sped_category" TEXT NOT NULL,
    "grade_band" TEXT NOT NULL,
    "amount_90pct" DECIMAL(12,2) NOT NULL,
    "updated_by" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dd_cap_matrix_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dd_cap_matrix_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_year" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB NOT NULL DEFAULT '[]',
    "after" JSONB NOT NULL DEFAULT '[]',
    "actor_id" UUID,
    "actor_email" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dd_cap_matrix_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "student_esa_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "school_year" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'none',
    "closed_on" DATE,
    "closure_document_id" UUID,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'application',
    "updated_by" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_esa_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "other_sto_scholarships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "school_year" TEXT NOT NULL,
    "application_id" UUID,
    "sto_name" TEXT NOT NULL,
    "program" TEXT NOT NULL DEFAULT 'unknown',
    "amount" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'application',
    "note" TEXT,
    "updated_by" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "other_sto_scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scholarship_award_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "school_year" TEXT,
    "need_assessment" JSONB NOT NULL DEFAULT '{}',
    "factors" JSONB NOT NULL DEFAULT '{}',
    "reviewers" JSONB NOT NULL DEFAULT '[]',
    "committee" JSONB NOT NULL DEFAULT '{}',
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "approved_by_email" TEXT,
    "notice_sent_at" TIMESTAMPTZ,
    "appeals" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scholarship_award_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "overflow_waiting_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "added_on" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID,
    "added_by_email" TEXT,
    "note" TEXT,
    "removed_at" TIMESTAMPTZ,
    "removed_by_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overflow_waiting_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public_page_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_by_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "award_policy_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_label" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "adopted_on" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "uploaded_by" UUID,
    "uploaded_by_email" TEXT,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_policy_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dd_cap_matrix_year_category_band_key" ON "dd_cap_matrix_rows"("school_year", "sped_category", "grade_band");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dd_cap_matrix_events_year_idx" ON "dd_cap_matrix_events"("school_year", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "student_esa_statuses_student_year_key" ON "student_esa_statuses"("student_id", "school_year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "other_sto_scholarships_student_year_idx" ON "other_sto_scholarships"("student_id", "school_year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scholarship_award_decisions_year_idx" ON "scholarship_award_decisions"("school_year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "overflow_waiting_list_student_idx" ON "overflow_waiting_list"("student_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "public_page_versions_slug_idx" ON "public_page_versions"("slug", "created_at");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarship_awards_decision_id_fkey') THEN
    ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "scholarship_award_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_esa_statuses_student_id_fkey') THEN
    ALTER TABLE "student_esa_statuses" ADD CONSTRAINT "student_esa_statuses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_sto_scholarships_student_id_fkey') THEN
    ALTER TABLE "other_sto_scholarships" ADD CONSTRAINT "other_sto_scholarships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overflow_waiting_list_student_id_fkey') THEN
    ALTER TABLE "overflow_waiting_list" ADD CONSTRAINT "overflow_waiting_list_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Server-only tables: no browser access ───────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dd_cap_matrix_rows', 'dd_cap_matrix_events', 'student_esa_statuses', 'other_sto_scholarships',
    'scholarship_award_decisions', 'overflow_waiting_list', 'public_page_versions', 'award_policy_documents'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;

-- ── ESA status per school year, from submitted applications ─────────────────
-- yes → active; unsure → active (payment stays blocked until staff confirm);
-- no → none. The latest submitted application for each student and year wins.
INSERT INTO "student_esa_statuses" ("student_id", "school_year", "status", "note", "source", "updated_at")
SELECT DISTINCT ON (a."student_id", a."school_year")
       a."student_id",
       a."school_year",
       CASE a."esa_current_year" WHEN 'no' THEN 'none' ELSE 'active' END,
       CASE a."esa_current_year" WHEN 'unsure' THEN 'Family answered "unsure" on the application.' ELSE NULL END,
       'application',
       now()
FROM "scholarship_applications" a
WHERE a."school_year" IS NOT NULL
  AND a."esa_current_year" IN ('yes', 'no', 'unsure')
  AND a."application_status" <> 'draft'
ORDER BY a."student_id", a."school_year", a."submitted_at" DESC NULLS LAST, a."created_at" DESC
ON CONFLICT ("student_id", "school_year") DO NOTHING;

-- ── Held awards: the hold now comes from the ESA status, not the award ──────
-- An award held for ESA becomes a normal award; the student's ESA status for
-- that year is active, which is what blocks payment to the school.
INSERT INTO "student_esa_statuses" ("student_id", "school_year", "status", "note", "source", "updated_at")
SELECT DISTINCT w."student_id", w."school_year", 'active', 'Award was held for ESA before ESA status was tracked per year.', 'admin', now()
FROM "scholarship_awards" w
WHERE w."status" = 'held_esa' AND w."school_year" IS NOT NULL
ON CONFLICT ("student_id", "school_year") DO UPDATE SET "status" = 'active'
  WHERE "student_esa_statuses"."status" = 'none';

UPDATE "scholarship_awards" SET "status" = 'awarded' WHERE "status" = 'held_esa';

-- ── Decision records for awards already made ────────────────────────────────
-- One record per award (its campaign lines share it). Left unapproved: the
-- committee approval has to be entered before any further payment.
INSERT INTO "scholarship_award_decisions" ("id", "student_id", "school_year", "updated_at")
SELECT DISTINCT ON (COALESCE(w."allocation_group_id", w."id"))
       COALESCE(w."allocation_group_id", w."id"), w."student_id", w."school_year", now()
FROM "scholarship_awards" w
WHERE w."decision_id" IS NULL
ORDER BY COALESCE(w."allocation_group_id", w."id"), w."created_at"
ON CONFLICT ("id") DO NOTHING;

UPDATE "scholarship_awards"
SET "decision_id" = COALESCE("allocation_group_id", "id")
WHERE "decision_id" IS NULL;
