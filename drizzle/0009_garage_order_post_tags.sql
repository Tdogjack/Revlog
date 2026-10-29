ALTER TABLE "posts" ADD COLUMN "tag" text DEFAULT 'build' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "position" integer;--> statement-breakpoint
-- Existing posts keep their meaning: build posts are tagged Build, mod posts New mod.
UPDATE "posts" SET "tag" = "kind"::text;
