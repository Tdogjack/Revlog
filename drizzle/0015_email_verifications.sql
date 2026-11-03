CREATE TABLE "email_verifications" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "email_verifications_owner_select" ON "email_verifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = user_id);--> statement-breakpoint
-- Everyone who signed up before this had to confirm their email to get in.
INSERT INTO "email_verifications" ("user_id", "verified_at")
SELECT id, email_confirmed_at FROM auth.users WHERE email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Storage rules call this so photo uploads need a confirmed email even when
-- they skip the app's server actions.
CREATE FUNCTION public.email_verified() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.email_verifications WHERE user_id = (select auth.uid())) $$;
--> statement-breakpoint
DROP POLICY "vehicle_photos_owner_insert" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text AND (select public.email_verified()));
--> statement-breakpoint
DROP POLICY "vehicle_photos_owner_update" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "vehicle_photos_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text AND (select public.email_verified()));
--> statement-breakpoint
DROP POLICY "community_photos_owner_insert" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "community_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text AND (select public.email_verified()));
