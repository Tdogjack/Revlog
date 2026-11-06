CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('post', 'comment', 'user');--> statement-breakpoint
CREATE TABLE "account_suspensions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_suspensions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_consents" (
	"user_id" uuid PRIMARY KEY DEFAULT auth.uid() NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid DEFAULT auth.uid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reported_user_id" uuid,
	"reported_username" text NOT NULL,
	"target_path" text NOT NULL,
	"content_snapshot" text,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "content_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	CONSTRAINT "user_blocks_not_self" CHECK ("user_blocks"."user_id" <> "user_blocks"."blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_suspensions" ADD CONSTRAINT "account_suspensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_once_idx" ON "content_reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "content_reports_target_idx" ON "content_reports" USING btree ("target_type","target_id","status");--> statement-breakpoint
CREATE INDEX "content_reports_status_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_idx" ON "user_blocks" USING btree ("user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_user_id");--> statement-breakpoint
CREATE POLICY "ai_consents_owner_all" ON "ai_consents" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "content_reports_reporter_select" ON "content_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = reporter_id);--> statement-breakpoint
CREATE POLICY "content_reports_reporter_insert" ON "content_reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = reporter_id);--> statement-breakpoint
CREATE POLICY "user_blocks_owner_all" ON "user_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);