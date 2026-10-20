-- Simplified award decision records, and the 90% state aid matrix rebuilt
-- around ADOR's published layout (five grade bands, one row per category
-- label, several codes per row). Oct 19, 2026.
--
-- Re-runnable: every step checks before it changes anything.

-- ── Decision records: one reviewer, recorded by "Mark reviewed" ─────────────
ALTER TABLE "scholarship_award_decisions" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(3);
ALTER TABLE "scholarship_award_decisions" ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "scholarship_award_decisions" ADD COLUMN IF NOT EXISTS "reviewed_by_email" TEXT;
ALTER TABLE "scholarship_award_decisions" ADD COLUMN IF NOT EXISTS "reviewed_by_name" TEXT;

-- The first reviewer typed on an older record becomes its reviewer. Every
-- reviewer, amount, fund and need note stays in the JSON columns as history.
UPDATE "scholarship_award_decisions"
SET "reviewed_by_name" = btrim("reviewers"->0->>'name'),
    "reviewed_at" = "updated_at"
WHERE "reviewed_at" IS NULL
  AND jsonb_typeof("reviewers") = 'array'
  AND coalesce(btrim("reviewers"->0->>'name'), '') <> '';

-- Financial need is the primary factor in every award: checked on open records.
UPDATE "scholarship_award_decisions"
SET "factors" = jsonb_set(coalesce("factors", '{}'::jsonb), '{financialNeed}', 'true'::jsonb)
WHERE "approved_at" IS NULL
  AND NOT (coalesce("factors", '{}'::jsonb) ? 'financialNeed');

-- Who reversed an award, for the reversed-award card.
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "reversed_by_email" TEXT;
UPDATE "scholarship_awards" a
SET "reversed_by_email" = p."email"
FROM "profiles" p
WHERE a."reversed_by" = p."id" AND a."reversed_by_email" IS NULL AND a."status" = 'reversed';

-- ── 90% state aid matrix: ADOR's layout ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "dd_state_aid_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_year" TEXT NOT NULL,
    "row_label" TEXT NOT NULL,
    "codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_regular_education" BOOLEAN NOT NULL DEFAULT false,
    "amount_preschool" DECIMAL(12,2),
    "amount_k" DECIMAL(12,2),
    "amount_1_3" DECIMAL(12,2),
    "amount_4_8" DECIMAL(12,2),
    "amount_9_12" DECIMAL(12,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "dd_state_aid_rows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dd_state_aid_rows_year_idx" ON "dd_state_aid_rows"("school_year");

CREATE TABLE IF NOT EXISTS "dd_cap_code_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label_key" TEXT NOT NULL,
    "row_label" TEXT NOT NULL,
    "codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_by" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "dd_cap_code_aliases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dd_cap_code_aliases_label_key" ON "dd_cap_code_aliases"("label_key");

ALTER TABLE "dd_cap_matrix_events" ADD COLUMN IF NOT EXISTS "source_file_name" TEXT;
ALTER TABLE "dd_cap_matrix_events" ADD COLUMN IF NOT EXISTS "source_mime_type" TEXT;
ALTER TABLE "dd_cap_matrix_events" ADD COLUMN IF NOT EXISTS "source_file" BYTEA;
ALTER TABLE "dd_cap_matrix_events" ADD COLUMN IF NOT EXISTS "cap_changes" JSONB NOT NULL DEFAULT '[]';

-- Old rows (one per category and preschool / K-8 / 9-12 band) become one row
-- per category: the K-8 amount fills Kindergarten, 1st-3rd and 4th-8th.
DO $$
BEGIN
  IF to_regclass('public.dd_cap_matrix_rows') IS NOT NULL THEN
    INSERT INTO "dd_state_aid_rows" (
      "school_year", "row_label", "codes", "is_regular_education",
      "amount_preschool", "amount_k", "amount_1_3", "amount_4_8", "amount_9_12",
      "sort_order", "updated_by", "updated_by_email", "updated_at"
    )
    SELECT
      r."school_year",
      CASE WHEN r."sped_category" = 'REG' THEN 'Regular Education' ELSE r."sped_category" END,
      ARRAY[r."sped_category"],
      r."sped_category" = 'REG',
      max(r."amount_90pct") FILTER (WHERE r."grade_band" = 'preschool'),
      max(r."amount_90pct") FILTER (WHERE r."grade_band" = 'k8'),
      max(r."amount_90pct") FILTER (WHERE r."grade_band" = 'k8'),
      max(r."amount_90pct") FILTER (WHERE r."grade_band" = 'k8'),
      max(r."amount_90pct") FILTER (WHERE r."grade_band" = '9_12'),
      CASE WHEN r."sped_category" = 'REG' THEN 1000 ELSE 0 END,
      (array_agg(r."updated_by"))[1],
      (array_agg(r."updated_by_email"))[1],
      CURRENT_TIMESTAMP
    FROM "dd_cap_matrix_rows" r
    WHERE NOT EXISTS (SELECT 1 FROM "dd_state_aid_rows" n WHERE n."school_year" = r."school_year")
    GROUP BY r."school_year", r."sped_category";
    DROP TABLE "dd_cap_matrix_rows";
  END IF;
END $$;

-- ADOR's FY2026-2027 DD Scholarship Payment Matrix, as published, becomes the
-- 2026/2027 matrix. Codes are split from each label; staff confirm them on the
-- 90% state aid matrix page. Runs once: skipped when the file is already in.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "dd_cap_matrix_events"
    WHERE "school_year" = '2026/2027' AND "source_file_name" = 'FY2026-2027_DD_Scholarship_Payment_Matrix.csv'
  ) THEN
    INSERT INTO "dd_cap_matrix_events" ("school_year", "action", "before", "after", "actor_email", "note", "source_file_name", "source_mime_type", "source_file")
    SELECT
      '2026/2027',
      'import',
      coalesce((SELECT jsonb_agg(jsonb_build_object('rowLabel', "row_label", 'codes', "codes")) FROM "dd_state_aid_rows" WHERE "school_year" = '2026/2027'), '[]'::jsonb),
      '[]'::jsonb,
      'migration',
      'ADOR FY2026-2027 DD Scholarship Payment Matrix, loaded at release. Confirm the codes for each row.',
      'FY2026-2027_DD_Scholarship_Payment_Matrix.csv',
      'text/csv',
      convert_to(
        E'Special Education Category,Preschool,Kindergarten,1st - 3rd,4th - 8th,9th - 12th\n'
        || E'Preschooler,3403.13,,,,\n'
        || E'HI,14600.62,14150.00,28299.99,27830.59,28346.93\n'
        || E'"MD, A, SID - SC",,17006.28,34012.56,33543.16,34059.50\n'
        || E'MDSSI,,21604.03,43208.06,42738.66,43255.00\n'
        || E'OI R,,10364.30,20728.60,20259.21,20775.55\n'
        || E'PS D,11840.55,,,,\n'
        || E'"ED, MIID, SLD, SLI, OHI, DD",,3637.84,7275.66,6806.27,7322.61\n'
        || E'EDP,,14269.69,28539.38,28069.98,28586.32\n'
        || E'MOID,,13328.55,26657.09,26187.70,26704.04\n'
        || E'VI,14682.76,14232.14,28464.27,27994.88,28511.22\n'
        || E'Regular Education (displaced pupils or children with a 504 plan),,2952.51,5905.02,5435.63,5951.96\n',
        'UTF8'
      );

    DELETE FROM "dd_state_aid_rows" WHERE "school_year" = '2026/2027';

    INSERT INTO "dd_state_aid_rows" (
      "school_year", "row_label", "codes", "is_regular_education",
      "amount_preschool", "amount_k", "amount_1_3", "amount_4_8", "amount_9_12", "sort_order", "updated_by_email", "updated_at"
    ) VALUES
      ('2026/2027', 'Preschooler', ARRAY['P'], false, 3403.13, NULL, NULL, NULL, NULL, 0, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'HI', ARRAY['HI'], false, 14600.62, 14150.00, 28299.99, 27830.59, 28346.93, 1, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'MD, A, SID - SC', ARRAY['MD', 'A', 'SID-SC'], false, NULL, 17006.28, 34012.56, 33543.16, 34059.50, 2, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'MDSSI', ARRAY['MDSSI'], false, NULL, 21604.03, 43208.06, 42738.66, 43255.00, 3, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'OI R', ARRAY['OIR'], false, NULL, 10364.30, 20728.60, 20259.21, 20775.55, 4, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'PS D', ARRAY['PSD'], false, 11840.55, NULL, NULL, NULL, NULL, 5, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'ED, MIID, SLD, SLI, OHI, DD', ARRAY['ED', 'MIID', 'SLD', 'SLI', 'OHI', 'DD'], false, NULL, 3637.84, 7275.66, 6806.27, 7322.61, 6, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'EDP', ARRAY['EDP'], false, NULL, 14269.69, 28539.38, 28069.98, 28586.32, 7, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'MOID', ARRAY['MOID'], false, NULL, 13328.55, 26657.09, 26187.70, 26704.04, 8, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'VI', ARRAY['VI'], false, 14682.76, 14232.14, 28464.27, 27994.88, 28511.22, 9, 'migration', CURRENT_TIMESTAMP),
      ('2026/2027', 'Regular Education (displaced pupils or children with a 504 plan)', ARRAY['REG'], true, NULL, 2952.51, 5905.02, 5435.63, 5951.96, 10, 'migration', CURRENT_TIMESTAMP);

    UPDATE "dd_cap_matrix_events"
    SET "after" = (SELECT jsonb_agg(jsonb_build_object('rowLabel', "row_label", 'codes', "codes") ORDER BY "sort_order") FROM "dd_state_aid_rows" WHERE "school_year" = '2026/2027')
    WHERE "school_year" = '2026/2027' AND "source_file_name" = 'FY2026-2027_DD_Scholarship_Payment_Matrix.csv';
  END IF;
END $$;

-- ── Server-only tables: no browser access ───────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dd_state_aid_rows', 'dd_cap_code_aliases'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
