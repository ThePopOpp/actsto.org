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