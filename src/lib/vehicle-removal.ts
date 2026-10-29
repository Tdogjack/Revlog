import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { photos, postPhotos, posts, vehicles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getVehicle } from "@/lib/vehicles";

// Deletes a car and everything tied to it. The database cascades the rows
// (records, mods, reminders, parts, photos, posts); files in storage don't
// cascade, so they're gathered first and removed after.
export async function deleteVehicle(userId: string, vehicleId: string) {
  const car = await getVehicle(userId, vehicleId);
  if (!car) return false;

  const [garagePhotos, carPosts] = await Promise.all([
    db
      .select({ path: photos.storagePath })
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.vehicleId, vehicleId))),
    db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.vehicleId, vehicleId))),
  ]);
  const sharedPhotos = carPosts.length
    ? await db
        .select({ path: postPhotos.storagePath })
        .from(postPhotos)
        .where(
          inArray(
            postPhotos.postId,
            carPosts.map((p) => p.id),
          ),
        )
    : [];

  await db.delete(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)));

  const supabase = await createClient();
  const privatePaths = [car.photoPath, ...garagePhotos.map((p) => p.path)].filter(
    (p): p is string => !!p,
  );
  if (privatePaths.length) await supabase.storage.from("vehicle-photos").remove(privatePaths);
  if (sharedPhotos.length) {
    await supabase.storage.from("community-photos").remove(sharedPhotos.map((p) => p.path));
  }
  return true;
}
