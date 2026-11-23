-- Check (offline) donations recorded by a Super Admin. Nov 16, 2026.
-- Spec: docs/scott-spaulding/ACTSTO-manual-check-donations-spec.md
--
-- A check is an ordinary paid donation (donations.status = 'paid'), so every
-- total, Allocation and receipt already treats it like an online gift. How it
-- was paid lives in donations.payment_provider, which already exists and
-- already defaults to 'paypal', so every existing row is backfilled as PayPal
-- without touching it. What only an offline payment has lives in a 1:1 table.
--
-- Re-runnable: every step checks before it changes anything.

-- ── Offline payment details ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "donation_offline_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donation_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "check_number" TEXT,
    "drawer_name" TEXT,
    "check_date" DATE,
    "date_received" DATE NOT NULL,
    "date_deposited" DATE,
    "internal_notes" TEXT,
    "tax_year_confirmation" TEXT,
    "tax_year_confirmed_at" TIMESTAMPTZ(6),
    "relationship_ack_method" TEXT,
    "relationship_ack_by_email" TEXT,
    "relationship_ack_at" TIMESTAMPTZ(6),
    "attachment_path" TEXT,
    "attachment_name" TEXT,
    "attachment_mime" TEXT,
    "attachment_size" INTEGER,
    "attachment_purge_after" DATE,
    "attachment_hold" BOOLEAN NOT NULL DEFAULT false,
    "recorded_by" UUID,
    "recorded_by_email" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMPTZ(6),
    "returned_reason" TEXT,
    "returned_by_email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "donation_offline_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "donation_offline_payments_method_check"
      CHECK ("method" IN ('check', 'cashiers_check', 'money_order'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "donation_offline_payments_donation_id_key"
  ON "donation_offline_payments"("donation_id");
CREATE INDEX IF NOT EXISTS "donation_offline_payments_check_number_idx"
  ON "donation_offline_payments"("check_number");
CREATE INDEX IF NOT EXISTS "donation_offline_payments_date_received_idx"
  ON "donation_offline_payments"("date_received");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donation_offline_payments_donation_id_fkey'
  ) THEN
    ALTER TABLE "donation_offline_payments"
      ADD CONSTRAINT "donation_offline_payments_donation_id_fkey"
      FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Reached only through Prisma on the owner connection. RLS on with no
-- policies keeps the anon key in the browser bundle away from it.
ALTER TABLE "donation_offline_payments" ENABLE ROW LEVEL SECURITY;

-- ── Payment method on every donation ───────────────────────────────────────
-- Existing rows are all 'paypal' (the column default). New methods are added
-- here and in lib/donations/payment-methods.ts together.
UPDATE "donations" SET "payment_provider" = 'paypal' WHERE "payment_provider" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_payment_provider_check') THEN
    ALTER TABLE "donations"
      ADD CONSTRAINT "donations_payment_provider_check"
      CHECK ("payment_provider" IN ('paypal', 'check', 'cashiers_check', 'money_order'))
      -- Guards new writes only, so an unexpected legacy value can never stop
      -- `prisma migrate deploy` (and with it, `npm start`).
      NOT VALID;
  END IF;
END $$;

-- ── Receipts: void and re-issue ────────────────────────────────────────────
ALTER TABLE "tax_receipts" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMPTZ(6);
ALTER TABLE "tax_receipts" ADD COLUMN IF NOT EXISTS "voided_by_email" TEXT;
ALTER TABLE "tax_receipts" ADD COLUMN IF NOT EXISTS "void_reason" TEXT;
ALTER TABLE "tax_receipts" ADD COLUMN IF NOT EXISTS "replaced_by_id" UUID;
