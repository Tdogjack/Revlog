-- Only car posts can be builds, and each car keeps just its newest one; older
-- extras become progress updates.
UPDATE "posts" SET "tag" = 'mod' WHERE "tag" = 'build' AND "kind" = 'mod';--> statement-breakpoint
UPDATE "posts" p SET "tag" = 'progress'
WHERE p."tag" = 'build'
  AND EXISTS (
    SELECT 1 FROM "posts" newer
    WHERE newer."vehicle_id" = p."vehicle_id" AND newer."tag" = 'build'
      AND (newer."created_at", newer."id") > (p."created_at", p."id")
  );--> statement-breakpoint
CREATE UNIQUE INDEX "posts_one_build_per_car_idx" ON "posts" USING btree ("vehicle_id") WHERE "posts"."tag" = 'build';
