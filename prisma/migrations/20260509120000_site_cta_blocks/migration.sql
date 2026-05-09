CREATE TABLE IF NOT EXISTS "site_cta_blocks" (
  "key" text PRIMARY KEY,
  "placement" text NOT NULL,
  "path" text,
  "heading" text NOT NULL,
  "subheading" text,
  "body" text,
  "primary_label" text NOT NULL,
  "primary_url" text NOT NULL,
  "primary_variant" text NOT NULL DEFAULT 'default',
  "show_secondary" boolean NOT NULL DEFAULT true,
  "secondary_label" text,
  "secondary_url" text,
  "image_url" text,
  "image_alt" text,
  "bg_color" text,
  "bg_color_end" text,
  "use_gradient" boolean NOT NULL DEFAULT false,
  "text_color" text,
  "padding" text NOT NULL DEFAULT 'default',
  "visible" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_site_cta_blocks_placement"
  ON "site_cta_blocks"("placement");

CREATE INDEX IF NOT EXISTS "idx_site_cta_blocks_visible_sort"
  ON "site_cta_blocks"("visible", "sort_order");
