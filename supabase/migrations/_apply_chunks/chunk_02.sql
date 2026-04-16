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