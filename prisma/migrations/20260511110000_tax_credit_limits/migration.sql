CREATE TABLE IF NOT EXISTS "tax_credit_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tax_year" integer NOT NULL,
  "filing_status" text NOT NULL,
  "original_credit_limit" numeric(14, 2),
  "overflow_credit_limit" numeric(14, 2),
  "combined_limit" numeric(14, 2),
  "effective_start_date" date,
  "effective_end_date" date,
  "source_url" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_credit_limits_tax_year_filing_status_key"
  ON "tax_credit_limits" ("tax_year", "filing_status");

INSERT INTO "tax_credit_limits" (
  "tax_year",
  "filing_status",
  "original_credit_limit",
  "overflow_credit_limit",
  "combined_limit",
  "effective_start_date",
  "notes"
) VALUES
  (2025, 'single', 769.00, 766.00, 1535.00, '2025-01-01', 'Seeded from ACTSTO admin defaults. Confirm annual values with AZ DOR.'),
  (2025, 'married', 1535.00, 1527.00, 3062.00, '2025-01-01', 'Seeded from ACTSTO admin defaults. Confirm annual values with AZ DOR.'),
  (2026, 'single', 787.00, 784.00, 1571.00, '2026-01-01', 'Seeded from ACTSTO admin defaults. Confirm annual values with AZ DOR.'),
  (2026, 'married', 1570.00, 1561.00, 3131.00, '2026-01-01', 'Seeded from ACTSTO admin defaults. Confirm annual values with AZ DOR.')
ON CONFLICT ("tax_year", "filing_status") DO UPDATE SET
  "original_credit_limit" = EXCLUDED."original_credit_limit",
  "overflow_credit_limit" = EXCLUDED."overflow_credit_limit",
  "combined_limit" = EXCLUDED."combined_limit",
  "effective_start_date" = EXCLUDED."effective_start_date",
  "notes" = EXCLUDED."notes",
  "updated_at" = now();
