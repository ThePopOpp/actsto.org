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
