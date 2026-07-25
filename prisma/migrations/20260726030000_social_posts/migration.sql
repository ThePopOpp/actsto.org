-- Social composer posts
CREATE TABLE IF NOT EXISTS "social_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "medium" TEXT NOT NULL,
  "width_px" INTEGER NOT NULL,
  "height_px" INTEGER NOT NULL,
  "caption" TEXT,
  "blocks" JSONB NOT NULL DEFAULT '[]',
  "bg_color" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMP(3),
  "campaign_id" UUID,
  "rendered_image_url" TEXT,
  "is_template" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "social_posts_status_idx" ON "social_posts" ("status");
CREATE INDEX IF NOT EXISTS "social_posts_campaign_id_idx" ON "social_posts" ("campaign_id");
CREATE INDEX IF NOT EXISTS "social_posts_is_template_idx" ON "social_posts" ("is_template");
