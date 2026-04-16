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
