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