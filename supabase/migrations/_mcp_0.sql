-- ACT Next.js — full Supabase schema (public + storage)
-- Project ref: vojbknwinfugutefmdvg
-- Apply via Supabase MCP apply_migration or: psql < this file

-- =============================================================================
-- Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Enums
-- =============================================================================
CREATE TYPE public.account_type AS ENUM (
  'parent',
  'student',
  'donor_individual',
  'donor_business',
  'school_staff',
  'super_admin'
);

CREATE TYPE public.campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
);

CREATE TYPE public.pledge_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'fulfilled'
);

CREATE TYPE public.donation_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE public.review_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE public.notification_kind AS ENUM (
  'campaign_update',
  'donation_received',
  'pledge_reminder',
  'system',
  'admin',
  'scholarship',
  'tax_credit'
);

-- =============================================================================
-- updated_at trigger helper
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_account_types_user_type_unique UNIQUE (user_id, account_type)
);

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  website text,
  address_line1 text,
  city text,
  state text,
  zip text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schools_slug_unique UNIQUE (slug)
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools (id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  grade text,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_types_slug_unique UNIQUE (slug)
);

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students (id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools (id) ON DELETE SET NULL,
  campaign_type_id uuid NOT NULL REFERENCES public.campaign_types (id) ON DELETE RESTRICT,
  title text NOT NULL,
  slug text NOT NULL,
  story text,
  goal_amount numeric(14, 2) NOT NULL DEFAULT 0,
  raised_amount numeric(14, 2) NOT NULL DEFAULT 0,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_slug_unique UNIQUE (slug)
);

CREATE TABLE public.giving_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  name text NOT NULL,
  min_amount numeric(14, 2) NOT NULL DEFAULT 0,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.pledge_status NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,