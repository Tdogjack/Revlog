-- Public bucket for photos shared in community posts. Files live at
-- <user_id>/<post_id>/<file>; anyone can view them, and each user can only
-- add or remove files under their own user_id folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-photos', 'community-photos', true, 1048576, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE POLICY "community_photos_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "community_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "community_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
