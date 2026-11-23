-- Agent platform: the ACT MCP server (Claude, ChatGPT, Codex, Paperclip and
-- Claude Managed Agents all connect through /api/mcp). Nov 23, 2026.
--
--   agent_identities   one row per AI agent: persona, mailbox, hashed token
--   mcp_oauth_*        OAuth 2.1 clients, codes and tokens for chat connectors
--   mcp_audit_logs     every MCP tool call, who made it, and whether it worked
--   outbound_drafts    agent-written emails waiting for a Super Admin to approve
--   agent_runs         each Managed Agents session (from Paperclip or the dashboard)
--   contacts           + segment, owner_agent_id, lead_score, source_url
--
-- Re-runnable: every step checks before it changes anything.

CREATE TABLE IF NOT EXISTS "agent_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "persona_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "mailbox" TEXT,
    "token_hash" TEXT,
    "token_hint" TEXT,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_send_cap" INTEGER NOT NULL DEFAULT 25,
    "managed_agent_id" TEXT,
    "environment_id" TEXT,
    "vault_id" TEXT,
    "memory_store_id" TEXT,
    "session_budget_cents" INTEGER NOT NULL DEFAULT 300,
    "paperclip_agent_id" TEXT,
    "last_used_at" TIMESTAMPTZ(6),
    "created_by_email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "agent_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_identities_slug_key" ON "agent_identities"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_identities_token_hash_key" ON "agent_identities"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_identities_paperclip_agent_id_key" ON "agent_identities"("paperclip_agent_id");

CREATE TABLE IF NOT EXISTS "mcp_oauth_clients" (
    "id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "redirect_uris" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "secret_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("id")
);

-- Codes and tokens are stored by SHA-256 hash only.
CREATE TABLE IF NOT EXISTS "mcp_oauth_codes" (
    "code_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "mcp_oauth_codes_pkey" PRIMARY KEY ("code_hash")
);

CREATE TABLE IF NOT EXISTS "mcp_oauth_tokens" (
    "token_hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_tokens_pkey" PRIMARY KEY ("token_hash")
);
CREATE INDEX IF NOT EXISTS "mcp_oauth_tokens_expires_idx" ON "mcp_oauth_tokens"("expires_at");

CREATE TABLE IF NOT EXISTS "mcp_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tool" TEXT NOT NULL,
    "caller" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "agent_id" UUID,
    "args" JSONB NOT NULL DEFAULT '{}',
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mcp_audit_logs_created_idx" ON "mcp_audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "mcp_audit_logs_tool_idx" ON "mcp_audit_logs"("tool");
CREATE INDEX IF NOT EXISTS "mcp_audit_logs_agent_idx" ON "mcp_audit_logs"("agent_id");

CREATE TABLE IF NOT EXISTS "outbound_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID,
    "contact_id" UUID,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "segment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_by_email" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "outbound_drafts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "outbound_drafts_status_idx" ON "outbound_drafts"("status");
CREATE INDEX IF NOT EXISTS "outbound_drafts_agent_idx" ON "outbound_drafts"("agent_id", "sent_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outbound_drafts_agent_id_fkey') THEN
    ALTER TABLE "outbound_drafts"
      ADD CONSTRAINT "outbound_drafts_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "agent_identities"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outbound_drafts_contact_id_fkey') THEN
    ALTER TABLE "outbound_drafts"
      ADD CONSTRAINT "outbound_drafts_contact_id_fkey"
      FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- One Claude Managed Agents session started for an agent, by Paperclip or from
-- the dashboard. paperclip_run_id is unique so a retried webhook never starts
-- a second session.
CREATE TABLE IF NOT EXISTS "agent_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "paperclip_run_id" TEXT,
    "paperclip_issue_id" TEXT,
    "task" TEXT NOT NULL,
    "session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "summary" TEXT,
    "error" TEXT,
    "cost_cents" INTEGER,
    "started_by" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_runs_paperclip_run_id_key" ON "agent_runs"("paperclip_run_id");
CREATE INDEX IF NOT EXISTS "agent_runs_agent_id_created_at_idx" ON "agent_runs"("agent_id", "created_at");
CREATE INDEX IF NOT EXISTS "agent_runs_status_idx" ON "agent_runs"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_runs_agent_id_fkey') THEN
    ALTER TABLE "agent_runs"
      ADD CONSTRAINT "agent_runs_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "agent_identities"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Leads live in contacts. segment: taxpayer | business | school | family.
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "segment" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "owner_agent_id" UUID;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lead_score" INTEGER;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
CREATE INDEX IF NOT EXISTS "contacts_segment_idx" ON "contacts"("segment");
CREATE INDEX IF NOT EXISTS "contacts_owner_agent_id_idx" ON "contacts"("owner_agent_id");

-- Reached only through Prisma on the owner connection. RLS on with no
-- policies keeps the browser's anon key away from tokens and drafts.
ALTER TABLE "agent_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_oauth_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_oauth_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_oauth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbound_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
