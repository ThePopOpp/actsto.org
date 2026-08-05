-- Scholarship application portal: household income, application windows,
-- documents, review ledger, and per-year student eligibility.
--
-- Written to be idempotent and re-runnable. `scholarship_applications` already
-- exists (supabase/migrations/006_extend_schema.sql) and is extended in place.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "income_frequency" AS ENUM ('annually', 'monthly', 'semimonthly', 'biweekly', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "application_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_info', 'approved', 'denied', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "review_action" AS ENUM ('claim', 'approve', 'deny', 'request_info', 'reopen', 'note', 'expire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "staff_role" AS ENUM ('admin', 'reviewer', 'read_only', 'finance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── profiles.staff_role ──────────────────────────────────────────────────────
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "staff_role" "staff_role";

-- ── household_members: owned by the parent, not by an application ────────────
CREATE TABLE IF NOT EXISTS "household_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "parent_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "role_label" TEXT,
  "work_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "work_frequency" "income_frequency" NOT NULL DEFAULT 'annually',
  "support_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "support_frequency" "income_frequency" NOT NULL DEFAULT 'annually',
  "retirement_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "retirement_frequency" "income_frequency" NOT NULL DEFAULT 'annually',
  "other_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "other_frequency" "income_frequency" NOT NULL DEFAULT 'annually',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "household_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "household_members_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profiles" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "household_members_parent_id_idx" ON "household_members" ("parent_id");

-- ── application_windows: open/close range per school year ────────────────────
CREATE TABLE IF NOT EXISTS "application_windows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_year" TEXT NOT NULL,
  "opens_at" TIMESTAMPTZ NOT NULL,
  "closes_at" TIMESTAMPTZ NOT NULL,
  "late_grace_until" TIMESTAMPTZ,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "application_windows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "application_windows_school_year_key" ON "application_windows" ("school_year");

-- ── scholarship_applications: extend in place ────────────────────────────────
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "grade" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "tuition_after_discounts" NUMERIC(10,2);
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "narrative" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_confirmed_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_confirmed_by" UUID;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "income_snapshot" JSONB;
-- Empty means unanswered. 'none' ("None of these apply") is an explicit answer
-- a reviewer can act on, so it must not also be the default.
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "overflow_qualification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "scholarship_applications" ALTER COLUMN "overflow_qualification" SET DEFAULT '';
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "overflow_org" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "overflow_comments" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "esa_current_year" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "esa_prior_year" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "certified_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "confirmation_code" TEXT;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "window_id" UUID;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "needs_info_due_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "fields_requested" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "reopened_by" UUID;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "reopened_at" TIMESTAMPTZ;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "info_not_received" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "supersedes_id" UUID;

-- application_status: text -> enum. Unknown legacy values fall back to 'draft'.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'scholarship_applications'
       AND column_name = 'application_status'
       AND data_type = 'text'
  ) THEN
    ALTER TABLE "scholarship_applications" ALTER COLUMN "application_status" DROP DEFAULT;
    ALTER TABLE "scholarship_applications"
      ALTER COLUMN "application_status" TYPE "application_status"
      USING (
        CASE
          WHEN "application_status" IN (
            'draft','submitted','under_review','needs_info','approved','denied','withdrawn'
          ) THEN "application_status"
          WHEN "application_status" = 'rejected'      THEN 'denied'
          WHEN "application_status" = 'pending'       THEN 'submitted'
          WHEN "application_status" = 'in_review'     THEN 'under_review'
          ELSE 'draft'
        END
      )::"application_status";
    ALTER TABLE "scholarship_applications" ALTER COLUMN "application_status" SET DEFAULT 'draft';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_window_id_fkey"
    FOREIGN KEY ("window_id") REFERENCES "application_windows" ("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_supersedes_id_fkey"
    FOREIGN KEY ("supersedes_id") REFERENCES "scholarship_applications" ("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "scholarship_applications_confirmation_code_key"
  ON "scholarship_applications" ("confirmation_code");
CREATE INDEX IF NOT EXISTS "scholarship_applications_guardian_user_id_idx"
  ON "scholarship_applications" ("guardian_user_id");
CREATE INDEX IF NOT EXISTS "scholarship_applications_student_id_school_year_idx"
  ON "scholarship_applications" ("student_id", "school_year");
CREATE INDEX IF NOT EXISTS "scholarship_applications_application_status_idx"
  ON "scholarship_applications" ("application_status");

-- One *live* application per student per year. A denied row does not block a
-- fresh attempt, but two in flight are impossible.
CREATE UNIQUE INDEX IF NOT EXISTS "one_live_application_per_student_year"
  ON "scholarship_applications" ("student_id", "school_year")
  WHERE "application_status" NOT IN ('denied', 'withdrawn') AND "school_year" IS NOT NULL;

-- ── application_documents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "storage_path" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "mime_type" TEXT NOT NULL,
  "document_kind" TEXT NOT NULL DEFAULT 'other',
  "uploaded_by" UUID,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "verified_at" TIMESTAMPTZ,
  "verified_by" UUID,
  "purge_after" DATE NOT NULL,
  "purged_at" TIMESTAMPTZ,
  "imported_from_id" UUID,
  CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "scholarship_applications" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "application_documents_application_id_idx" ON "application_documents" ("application_id");
CREATE INDEX IF NOT EXISTS "application_documents_purge_after_idx" ON "application_documents" ("purge_after");
CREATE INDEX IF NOT EXISTS "application_documents_storage_path_idx" ON "application_documents" ("storage_path");

-- ── application_reviews: append-only decision ledger ─────────────────────────
CREATE TABLE IF NOT EXISTS "application_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "reviewer_id" UUID NOT NULL,
  "action" "review_action" NOT NULL,
  "internal_note" TEXT,
  "parent_message" TEXT,
  "fields_requested" TEXT[] NOT NULL DEFAULT '{}',
  "due_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "application_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "scholarship_applications" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "application_reviews_application_id_created_at_idx" ON "application_reviews" ("application_id", "created_at");

-- ── student_year_eligibility: what the awarding process reads ────────────────
CREATE TABLE IF NOT EXISTS "student_year_eligibility" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "school_year" TEXT NOT NULL,
  "overflow_eligible" BOOLEAN NOT NULL DEFAULT false,
  "overflow_qualification" TEXT,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "verified_by" UUID NOT NULL,
  "source_application_id" UUID NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "revoked_reason" TEXT,
  "revoked_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "student_year_eligibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_year_eligibility_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE,
  CONSTRAINT "student_year_eligibility_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "scholarship_applications" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_year_eligibility_student_id_school_year_key"
  ON "student_year_eligibility" ("student_id", "school_year");

-- ── document_access_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "document_access_log" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL,
  "accessed_by" UUID,
  "accessor_email" TEXT,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "document_access_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_access_log_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "application_documents" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "document_access_log_document_id_created_at_idx" ON "document_access_log" ("document_id", "created_at");

-- ── updated_at triggers, matching the existing domain-table convention ───────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_household_members_updated_at') THEN
      CREATE TRIGGER tr_household_members_updated_at
        BEFORE UPDATE ON "household_members"
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_application_windows_updated_at') THEN
      CREATE TRIGGER tr_application_windows_updated_at
        BEFORE UPDATE ON "application_windows"
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_student_year_eligibility_updated_at') THEN
      CREATE TRIGGER tr_student_year_eligibility_updated_at
        BEFORE UPDATE ON "student_year_eligibility"
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
  END IF;
END $$;

-- ── Attempt chain view: how a student-year reached its current outcome ───────
CREATE OR REPLACE VIEW "application_chains" AS
WITH RECURSIVE chain AS (
  SELECT a.id, a.id AS root_id, a.student_id, a.school_year,
         a.attempt_number, a.application_status, a.supersedes_id
    FROM "scholarship_applications" a
   WHERE a.supersedes_id IS NULL
  UNION ALL
  SELECT a.id, c.root_id, a.student_id, a.school_year,
         a.attempt_number, a.application_status, a.supersedes_id
    FROM "scholarship_applications" a
    JOIN chain c ON a.supersedes_id = c.id
)
SELECT * FROM chain;

-- ── RLS: defence in depth ────────────────────────────────────────────────────
-- Application code reaches these tables through Prisma on a privileged
-- connection, so tenancy is enforced in lib/scholarship/scope.ts. These policies
-- exist so that anything arriving via the Supabase client (PostgREST, realtime,
-- a future edge function) is denied by default rather than open by default.
ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_year_eligibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_access_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_windows" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "household_members_own" ON "household_members"
    FOR ALL TO authenticated
    USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "application_documents_own" ON "application_documents"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "scholarship_applications" a
       WHERE a.id = application_id AND a.guardian_user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "application_windows_read_published" ON "application_windows"
    FOR SELECT TO authenticated USING (is_published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- application_reviews, student_year_eligibility and document_access_log get no
-- policy at all: RLS on with zero policies denies every non-privileged read,
-- which is the correct default for staff-only decision data.
