-- Migration 007: Create admin_integration_settings table
-- Stores PayPal and Twilio credentials managed by Super Admin.

create table if not exists public.admin_integration_settings (
  key        text        primary key,
  payload    jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Only super admin service role should access this table
alter table public.admin_integration_settings enable row level security;

-- No RLS policies — accessed only via service role (server-side Prisma)
