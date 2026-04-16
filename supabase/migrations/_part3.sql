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
