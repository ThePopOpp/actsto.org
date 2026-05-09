CREATE TABLE "site_content_settings" (
  "key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_content_settings_pkey" PRIMARY KEY ("key")
);
