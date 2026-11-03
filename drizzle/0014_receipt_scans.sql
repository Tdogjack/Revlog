CREATE TABLE "receipt_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipt_scans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "receipt_scans" ADD CONSTRAINT "receipt_scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_scans_user_created_idx" ON "receipt_scans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE POLICY "receipt_scans_owner_all" ON "receipt_scans" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);