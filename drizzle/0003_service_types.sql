CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_types_user_name_idx" ON "service_types" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE POLICY "service_types_owner_all" ON "service_types" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);