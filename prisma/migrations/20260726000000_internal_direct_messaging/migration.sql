-- Internal direct messaging
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "is_group" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT,
  "created_by" UUID,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx" ON "conversations" ("last_message_at");

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT,
  "last_read_at" TIMESTAMP(3),
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversation_id_user_id_key" ON "conversation_participants" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "conversation_participants_user_id_idx" ON "conversation_participants" ("user_id");

CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "attachment_url" TEXT,
  "edited_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "direct_messages_conversation_id_created_at_idx" ON "direct_messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "direct_messages_sender_id_idx" ON "direct_messages" ("sender_id");
