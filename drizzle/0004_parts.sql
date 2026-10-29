CREATE TABLE "part_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"part_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text
);
--> statement-breakpoint
ALTER TABLE "part_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"mod_id" uuid,
	"service_record_id" uuid,
	"name" text NOT NULL,
	"url" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(10, 2),
	"currency" text,
	"track_price" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_check_error" text,
	CONSTRAINT "parts_one_parent" CHECK (("parts"."mod_id" is not null)::int + ("parts"."service_record_id" is not null)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "parts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "part_prices" ADD CONSTRAINT "part_prices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_prices" ADD CONSTRAINT "part_prices_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_mod_id_mods_id_fk" FOREIGN KEY ("mod_id") REFERENCES "public"."mods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_service_record_id_service_records_id_fk" FOREIGN KEY ("service_record_id") REFERENCES "public"."service_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "part_prices_owner_all" ON "part_prices" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "parts_owner_all" ON "parts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);