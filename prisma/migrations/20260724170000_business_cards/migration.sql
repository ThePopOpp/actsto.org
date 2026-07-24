-- Digital Business Cards: cards + links + sections + analytics events + leads.
-- Owned by any dashboard user (keyed by owner_email). Public page at /c/{slug}.

CREATE TABLE IF NOT EXISTS "business_cards" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_email"          TEXT NOT NULL,
  "owner_name"           TEXT,
  "slug"                 TEXT NOT NULL,
  "card_name"            TEXT NOT NULL DEFAULT 'My Business Card',
  "status"               TEXT NOT NULL DEFAULT 'draft',
  "is_public"            BOOLEAN NOT NULL DEFAULT false,
  "display_name"         TEXT,
  "first_name"           TEXT,
  "last_name"            TEXT,
  "job_title"            TEXT,
  "company_name"         TEXT,
  "department"           TEXT,
  "bio"                  TEXT,
  "profile_photo_url"    TEXT,
  "logo_url"             TEXT,
  "background_image_url" TEXT,
  "background_color"     TEXT NOT NULL DEFAULT '#001138',
  "accent_color"         TEXT NOT NULL DEFAULT '#C9A96E',
  "text_color"           TEXT NOT NULL DEFAULT '#F4F1EA',
  "card_mode"            TEXT NOT NULL DEFAULT 'standard',
  "theme_mode"           TEXT NOT NULL DEFAULT 'dark',
  "layout_template"      TEXT NOT NULL DEFAULT 'classic',
  "primary_phone"        TEXT,
  "sms_phone"            TEXT,
  "primary_email"        TEXT,
  "website_url"          TEXT,
  "maps_url"             TEXT,
  "intro_video_url"      TEXT,
  "qr_settings"          JSONB NOT NULL DEFAULT '{}',
  "lead_form_settings"   JSONB NOT NULL DEFAULT '{}',
  "media_settings"       JSONB NOT NULL DEFAULT '{}',
  "slider_pages"         JSONB NOT NULL DEFAULT '[]',
  "automations"          JSONB NOT NULL DEFAULT '[]',
  "nfc_status"           TEXT NOT NULL DEFAULT 'not_ordered',
  "view_count"           INTEGER NOT NULL DEFAULT 0,
  "click_count"          INTEGER NOT NULL DEFAULT 0,
  "published_at"         TIMESTAMP(3),
  "archived_at"          TIMESTAMP(3),
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_cards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "business_cards_slug_key" ON "business_cards" ("slug");
CREATE INDEX IF NOT EXISTS "business_cards_owner_email_idx" ON "business_cards" ("owner_email");
CREATE INDEX IF NOT EXISTS "business_cards_status_idx" ON "business_cards" ("status");

CREATE TABLE IF NOT EXISTS "business_card_links" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_id"         UUID NOT NULL,
  "label"           TEXT NOT NULL,
  "url"             TEXT NOT NULL DEFAULT '',
  "link_type"       TEXT NOT NULL DEFAULT 'custom',
  "icon"            TEXT,
  "display_order"   INTEGER NOT NULL DEFAULT 100,
  "is_visible"      BOOLEAN NOT NULL DEFAULT true,
  "open_in_new_tab" BOOLEAN NOT NULL DEFAULT true,
  "click_count"     INTEGER NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_card_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_card_links_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "business_card_links_card_id_display_order_idx" ON "business_card_links" ("card_id", "display_order");

CREATE TABLE IF NOT EXISTS "business_card_sections" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_id"        UUID NOT NULL,
  "section_type"   TEXT NOT NULL,
  "label"          TEXT NOT NULL,
  "content"        JSONB NOT NULL DEFAULT '{}',
  "display_order"  INTEGER NOT NULL DEFAULT 100,
  "is_visible"     BOOLEAN NOT NULL DEFAULT true,
  "margin_top"     INTEGER NOT NULL DEFAULT 0,
  "margin_bottom"  INTEGER NOT NULL DEFAULT 16,
  "padding_top"    INTEGER NOT NULL DEFAULT 0,
  "padding_bottom" INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_card_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_card_sections_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "business_card_sections_card_id_display_order_idx" ON "business_card_sections" ("card_id", "display_order");

CREATE TABLE IF NOT EXISTS "business_card_events" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_id"     UUID NOT NULL,
  "link_id"     UUID,
  "event_type"  TEXT NOT NULL,
  "source"      TEXT DEFAULT 'public_card',
  "device_type" TEXT,
  "referrer"    TEXT,
  "user_agent"  TEXT,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_card_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_card_events_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "business_card_events_card_id_event_type_created_at_idx" ON "business_card_events" ("card_id", "event_type", "created_at");

CREATE TABLE IF NOT EXISTS "business_card_leads" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_id"           UUID NOT NULL,
  "owner_email"       TEXT,
  "name"              TEXT,
  "email"             TEXT,
  "phone"             TEXT,
  "company"           TEXT,
  "message"           TEXT,
  "preferred_contact" TEXT,
  "source"            TEXT DEFAULT 'public_card',
  "status"            TEXT NOT NULL DEFAULT 'new',
  "payload"           JSONB NOT NULL DEFAULT '{}',
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_card_leads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_card_leads_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "business_card_leads_card_id_created_at_idx" ON "business_card_leads" ("card_id", "created_at");
CREATE INDEX IF NOT EXISTS "business_card_leads_owner_email_status_idx" ON "business_card_leads" ("owner_email", "status");
