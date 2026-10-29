-- Private bucket for car photos. Files live at <user_id>/<vehicle_id>/<file>,
-- and each user can only touch files under their own user_id folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-photos', 'vehicle-photos', false, 1048576, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
