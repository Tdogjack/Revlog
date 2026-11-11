CREATE TABLE "rate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_events" ADD CONSTRAINT "rate_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_events_user_action_created_idx" ON "rate_events" USING btree ("user_id","action","created_at");--> statement-breakpoint
DROP POLICY "receipt_scans_owner_all" ON "receipt_scans" CASCADE;--> statement-breakpoint
CREATE POLICY "receipt_scans_owner_all" ON "receipt_scans" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "rate_events_owner_select" ON "rate_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = user_id);