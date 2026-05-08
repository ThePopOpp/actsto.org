-- Migration 008: Create missing admin tables
-- Fixes 500 errors on Users, Campaigns, Legal, and PayPal/Twilio settings pages.
--
-- These models existed in the Prisma schema but were never migrated to the DB.
-- Column names use snake_case to match the @map() decorators now added to the schema.

-- ── admin_users ──────────────────────────────────────────────────────────────
-- Separate from auth.users / profiles — used by the Super Admin user manager.
create table if not exists public.admin_users (
  id             text        primary key,
  email          text        not null,
  password       text        not null,
  name           text,
  role           text        not null default 'parent',
  roles          jsonb,
  account_status text        not null default 'active',
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists admin_users_email_unique on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

-- ── audit_logs ───────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id           text        primary key,
  action       text        not null,
  actor_id     text        references public.admin_users(id) on delete set null,
  actor_email  text,
  target_id    text,
  target_email text,
  metadata     text,
  ip           text,
  created_at   timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- ── legal_documents ──────────────────────────────────────────────────────────
create table if not exists public.legal_documents (
  id         text        primary key,
  slug       text        not null unique,
  body_html  text        not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;

-- ── admin_campaign_directory ─────────────────────────────────────────────────
-- Single-row JSON store for the Super Admin campaign directory widget.
create table if not exists public.admin_campaign_directory (
  id         text        primary key,
  rows       jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.admin_campaign_directory enable row level security;

-- ── fix admin_integration_settings updated_at trigger ────────────────────────
-- The updated_at column exists but has no auto-update trigger.
-- Create a shared trigger function if it doesn't already exist, then attach it.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_admin_users_updated_at'
  ) then
    create trigger set_admin_users_updated_at
      before update on public.admin_users
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_legal_documents_updated_at'
  ) then
    create trigger set_legal_documents_updated_at
      before update on public.legal_documents
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_admin_campaign_directory_updated_at'
  ) then
    create trigger set_admin_campaign_directory_updated_at
      before update on public.admin_campaign_directory
      for each row execute function public.set_updated_at();
  end if;
end $$;
