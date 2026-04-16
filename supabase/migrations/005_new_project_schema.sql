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
  pledge_id uuid REFERENCES public.pledges (id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.donation_status NOT NULL DEFAULT 'pending',
  external_payment_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status public.review_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_campaign_donor_unique UNIQUE (campaign_id, donor_id)
);

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- updated_at triggers (tables with updated_at)
-- =============================================================================
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_pledges_updated_at
  BEFORE UPDATE ON public.pledges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- is_admin()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_account_types uat
    WHERE uat.user_id = auth.uid()
      AND uat.account_type = 'super_admin'::public.account_type
  );
$$;

-- =============================================================================
-- New auth user → profile row
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- make_pledge — inserts matching rows in pledges + donations
-- =============================================================================
CREATE OR REPLACE FUNCTION public.make_pledge(
  p_campaign_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'USD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pledge_id uuid;
  v_donation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO public.pledges (user_id, campaign_id, amount, currency, status)
  VALUES (auth.uid(), p_campaign_id, p_amount, COALESCE(p_currency, 'USD'), 'pending'::public.pledge_status)
  RETURNING id INTO v_pledge_id;

  INSERT INTO public.donations (user_id, campaign_id, pledge_id, amount, currency, status)
  VALUES (
    auth.uid(),
    p_campaign_id,
    v_pledge_id,
    p_amount,
    COALESCE(p_currency, 'USD'),
    'pending'::public.donation_status
  )
  RETURNING id INTO v_donation_id;

  RETURN jsonb_build_object(
    'pledge_id', v_pledge_id,
    'donation_id', v_donation_id
  );
END;
$$;

-- =============================================================================
-- Seed: 12 campaign types
-- =============================================================================
INSERT INTO public.campaign_types (slug, name, description, sort_order)
VALUES
  ('preschools', 'PreSchools', 'Early childhood and preschool programs', 10),
  ('elementary-schools', 'Elementary Schools', 'K–5 elementary education', 20),
  ('middle-schools', 'Middle Schools', 'Middle school grades', 30),
  ('high-schools', 'High Schools', 'High school grades 9–12', 40),
  ('trade-schools', 'Trade Schools', 'Career and technical trade programs', 50),
  ('private-schools', 'Private Schools', 'General private school tuition support', 60),
  ('stem', 'STEM', 'Science, technology, engineering, and mathematics', 70),
  ('vocational', 'Vocational', 'Vocational training and certifications', 80),
  ('scholarships', 'Scholarships', 'Merit- and need-based scholarship funds', 90),
  ('business-schools', 'Business Schools', 'Business and entrepreneurship education', 100),
  ('music-school', 'Music School', 'Music and performing arts education', 110),
  ('all-grades', 'All Grades', 'Multi-grade or all-grade campaigns', 120);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX idx_user_account_types_user_id ON public.user_account_types (user_id);
CREATE INDEX idx_students_parent ON public.students (parent_user_id);
CREATE INDEX idx_students_school ON public.students (school_id);
CREATE INDEX idx_campaigns_creator ON public.campaigns (created_by_user_id);
CREATE INDEX idx_campaigns_student ON public.campaigns (student_id);
CREATE INDEX idx_campaigns_school ON public.campaigns (school_id);
CREATE INDEX idx_campaigns_type ON public.campaigns (campaign_type_id);
CREATE INDEX idx_campaigns_status ON public.campaigns (status);
CREATE INDEX idx_campaigns_ends_at ON public.campaigns (ends_at);
CREATE INDEX idx_giving_levels_campaign ON public.giving_levels (campaign_id);
CREATE INDEX idx_pledges_user ON public.pledges (user_id);
CREATE INDEX idx_pledges_campaign ON public.pledges (campaign_id);
CREATE INDEX idx_pledges_status ON public.pledges (status);
CREATE INDEX idx_donations_user ON public.donations (user_id);
CREATE INDEX idx_donations_campaign ON public.donations (campaign_id);
CREATE INDEX idx_donations_pledge ON public.donations (pledge_id);
CREATE INDEX idx_donations_status ON public.donations (status);
CREATE INDEX idx_reviews_campaign ON public.reviews (campaign_id);
CREATE INDEX idx_reviews_donor ON public.reviews (donor_id);
CREATE INDEX idx_photos_campaign ON public.photos (campaign_id);
CREATE INDEX idx_campaign_updates_campaign ON public.campaign_updates (campaign_id);
CREATE INDEX idx_campaign_faqs_campaign ON public.campaign_faqs (campaign_id);
CREATE INDEX idx_notifications_user ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

-- user_account_types
CREATE POLICY "user_account_types_select_own_or_admin"
  ON public.user_account_types FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_account_types_insert_own_or_admin"
  ON public.user_account_types FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_account_types_update_own_or_admin"
  ON public.user_account_types FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_account_types_delete_own_or_admin"
  ON public.user_account_types FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- schools (read public; write admin)
CREATE POLICY "schools_select_all"
  ON public.schools FOR SELECT
  USING (true);

CREATE POLICY "schools_write_admin"
  ON public.schools FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- students (parent owns; admin all)
CREATE POLICY "students_select_own_or_admin"
  ON public.students FOR SELECT
  USING (parent_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "students_insert_own_or_admin"
  ON public.students FOR INSERT
  WITH CHECK (parent_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "students_update_own_or_admin"
  ON public.students FOR UPDATE
  USING (parent_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "students_delete_own_or_admin"
  ON public.students FOR DELETE
  USING (parent_user_id = auth.uid() OR public.is_admin());

-- campaign_types (read all)
CREATE POLICY "campaign_types_select_all"
  ON public.campaign_types FOR SELECT
  USING (true);

CREATE POLICY "campaign_types_write_admin"
  ON public.campaign_types FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- campaigns
CREATE POLICY "campaigns_select_public_or_owner"
  ON public.campaigns FOR SELECT
  USING (
    status = 'active'::public.campaign_status
    OR created_by_user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "campaigns_insert_authenticated"
  ON public.campaigns FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "campaigns_update_owner_or_admin"
  ON public.campaigns FOR UPDATE
  USING (created_by_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "campaigns_delete_owner_or_admin"
  ON public.campaigns FOR DELETE
  USING (created_by_user_id = auth.uid() OR public.is_admin());

-- giving_levels
CREATE POLICY "giving_levels_select_visible"
  ON public.giving_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.status = 'active'::public.campaign_status
          OR c.created_by_user_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "giving_levels_write_owner_or_admin"
  ON public.giving_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- pledges
CREATE POLICY "pledges_select_own_or_admin"
  ON public.pledges FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "pledges_insert_own"
  ON public.pledges FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "pledges_update_own_or_admin"
  ON public.pledges FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- donations
CREATE POLICY "donations_select_own_or_campaign_owner_or_admin"
  ON public.donations FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "donations_insert_own_or_admin"
  ON public.donations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

CREATE POLICY "donations_update_owner_or_admin"
  ON public.donations FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- reviews
CREATE POLICY "reviews_select_visible"
  ON public.reviews FOR SELECT
  USING (
    status = 'approved'::public.review_status
    OR donor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.created_by_user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "reviews_insert_donor"
  ON public.reviews FOR INSERT
  WITH CHECK (donor_id = auth.uid() OR public.is_admin());

CREATE POLICY "reviews_update_own_or_admin"
  ON public.reviews FOR UPDATE
  USING (donor_id = auth.uid() OR public.is_admin());

-- photos
CREATE POLICY "photos_select_visible"
  ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.status = 'active'::public.campaign_status
          OR c.created_by_user_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "photos_write_campaign_owner"
  ON public.photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- campaign_updates
CREATE POLICY "campaign_updates_select_visible"
  ON public.campaign_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.status = 'active'::public.campaign_status
          OR c.created_by_user_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "campaign_updates_write_owner"
  ON public.campaign_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- campaign_faqs
CREATE POLICY "campaign_faqs_select_visible"
  ON public.campaign_faqs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.status = 'active'::public.campaign_status
          OR c.created_by_user_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "campaign_faqs_write_owner"
  ON public.campaign_faqs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by_user_id = auth.uid() OR public.is_admin())
    )
  );

-- notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- Grant execute on RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.make_pledge(uuid, numeric, text) TO authenticated;

-- =============================================================================
-- Storage buckets + policies
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('campaign-images', 'campaign-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('school-logos', 'school-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]),
  ('campaign-photos', 'campaign-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for all four buckets
CREATE POLICY "storage_public_read_avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "storage_public_read_campaign_images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign-images');

CREATE POLICY "storage_public_read_school_logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'school-logos');

CREATE POLICY "storage_public_read_campaign_photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign-photos');

-- Authenticated upload (object owner = uid)
CREATE POLICY "storage_authenticated_upload_avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

CREATE POLICY "storage_authenticated_upload_campaign_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-images'
    AND owner = auth.uid()
  );

CREATE POLICY "storage_authenticated_upload_school_logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school-logos'
    AND owner = auth.uid()
  );

CREATE POLICY "storage_authenticated_upload_campaign_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-photos'
    AND owner = auth.uid()
  );

-- Allow users to update/delete their own objects
CREATE POLICY "storage_authenticated_update_own_avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_delete_own_avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_update_own_campaign_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-images' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_delete_own_campaign_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-images' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_update_own_school_logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'school-logos' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_delete_own_school_logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'school-logos' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_update_own_campaign_photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-photos' AND owner = auth.uid());

CREATE POLICY "storage_authenticated_delete_own_campaign_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-photos' AND owner = auth.uid());
