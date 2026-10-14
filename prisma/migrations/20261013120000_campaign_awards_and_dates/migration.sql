-- Oct 13 review: every award names the campaign it draws from, and dates
-- entered as calendar days are stored without a UTC shift. Re-runnable.

-- ── Awards: campaign lines ──────────────────────────────────────────────────
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "draws_from_general" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scholarship_awards" ADD COLUMN IF NOT EXISTS "allocation_group_id" UUID;
CREATE INDEX IF NOT EXISTS "scholarship_awards_group_idx" ON "scholarship_awards" ("allocation_group_id");

-- ── Date sent ───────────────────────────────────────────────────────────────
-- "Date sent" was saved as midnight UTC of the day entered, which is 5 PM the
-- day before in Arizona, so 10/11 showed as 10/10. Payments recorded from that
-- field carry exactly midnight UTC; move them to noon Arizona time on the same
-- calendar day. Anything not at exactly midnight UTC was not entered that way
-- and is left alone, so running this again changes nothing.
UPDATE "scholarship_payments"
SET "paid_at" = (date_trunc('day', "paid_at" AT TIME ZONE 'UTC') + interval '19 hours') AT TIME ZONE 'UTC'
WHERE "paid_at" IS NOT NULL
  AND ("paid_at" AT TIME ZONE 'UTC') = date_trunc('day', "paid_at" AT TIME ZONE 'UTC');

-- ── Award date ──────────────────────────────────────────────────────────────
-- award_date was set from the server's UTC "today", so an award made on an
-- Arizona evening was dated the next day. Re-derive it from when the award was
-- created, on the Arizona calendar.
UPDATE "scholarship_awards"
SET "award_date" = ("created_at" AT TIME ZONE 'America/Phoenix')::date
WHERE "award_date" IS DISTINCT FROM ("created_at" AT TIME ZONE 'America/Phoenix')::date;
