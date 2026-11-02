CREATE TABLE "mileage_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"read_on" date NOT NULL,
	"mileage" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mileage_readings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mileage_readings" ADD CONSTRAINT "mileage_readings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_readings" ADD CONSTRAINT "mileage_readings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mileage_readings_vehicle_day_idx" ON "mileage_readings" USING btree ("vehicle_id","read_on");--> statement-breakpoint
CREATE POLICY "mileage_readings_owner_all" ON "mileage_readings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
-- Start each car's history with its current odometer, dated when the car was last changed.
INSERT INTO "mileage_readings" ("user_id", "vehicle_id", "read_on", "mileage")
SELECT "user_id", "id", "updated_at"::date, "current_mileage" FROM "vehicles";
