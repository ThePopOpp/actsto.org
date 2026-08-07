-- Email template catalogue + granular delivery preferences.
--
-- Two changes that go together: templates gain the hero/branding fields the
-- shared layout renders, and preferences gain a switch per optional email
-- category so "I want campaign alerts but not product news" is expressible.

-- ── email_templates ─────────────────────────────────────────────────────────
-- `catalog_key` ties a row to an entry in lib/email/catalog.ts. It makes
-- installing the starter set idempotent (re-running never duplicates) and lets
-- the sender find "the template for this event" without matching on a title
-- someone may have since renamed.
ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "catalog_key"         text,
  ADD COLUMN IF NOT EXISTS "category"            text,
  ADD COLUMN IF NOT EXISTS "audience_role"       text,
  ADD COLUMN IF NOT EXISTS "eyebrow"             text,
  ADD COLUMN IF NOT EXISTS "hero_title"          text,
  ADD COLUMN IF NOT EXISTS "hero_subtitle"       text,
  ADD COLUMN IF NOT EXISTS "featured_image_url"  text,
  ADD COLUMN IF NOT EXISTS "cta_label"           text,
  ADD COLUMN IF NOT EXISTS "cta_url"             text;

-- One row per catalogue entry. A partial index so the many ad-hoc templates
-- with no catalog_key don't collide with each other on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_catalog_key_key"
  ON "email_templates" ("catalog_key")
  WHERE "catalog_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "email_templates_category_idx"
  ON "email_templates" ("category");

-- ── communication_preferences ───────────────────────────────────────────────
-- Defaults are deliberate. Campaign alerts and product news default ON because
-- they're the useful, low-volume ones people expect from a service they signed
-- up for; the featured-campaign digest defaults ON but is the first thing most
-- people turn off, and marketing stays OFF (it already did) because broadcast
-- promotion should be opt-in.
ALTER TABLE "communication_preferences"
  ADD COLUMN IF NOT EXISTS "campaign_alerts_enabled"    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featured_campaigns_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "product_updates_enabled"    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "scholarship_updates_enabled" boolean NOT NULL DEFAULT true,
  -- When someone unsubscribes from everything optional at once, we keep the
  -- moment. Compliance asks "when did they opt out", and "the row says false"
  -- is not an answer.
  ADD COLUMN IF NOT EXISTS "unsubscribed_all_at"        timestamptz;
