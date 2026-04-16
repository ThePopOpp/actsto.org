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