import "server-only";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { getMod } from "@/lib/mods";
import { deleteVehiclePhoto, signedPhotoUrls, uploadVehiclePhoto } from "@/lib/photos";
import { getServiceRecord } from "@/lib/service-records";
import { createClient } from "@/lib/supabase/server";
import { getVehicle, isUuid } from "@/lib/vehicles";

// Where a photo belongs: the car's build library, one mod, or one service
// record (receipts).
export type PhotoTarget =
  { kind: "build" } | { kind: "mod"; id: string } | { kind: "record"; id: string };

export const PHOTO_LIMITS: Record<PhotoTarget["kind"], number> = {
  build: 30,
  mod: 10,
  record: 5,
};

function targetFilter(target: PhotoTarget) {
  if (target.kind === "mod") return eq(photos.modId, target.id);
  if (target.kind === "record") return eq(photos.serviceRecordId, target.id);
  return and(isNull(photos.modId), isNull(photos.serviceRecordId));
}

export function listPhotosForVehicle(userId: string, vehicleId: string) {
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), eq(photos.vehicleId, vehicleId)))
    .orderBy(asc(photos.createdAt));
}

// One mod's or record's photos with viewable links, for its edit form.
export async function signedPhotosFor(userId: string, vehicleId: string, target: PhotoTarget) {
  const rows = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), eq(photos.vehicleId, vehicleId), targetFilter(target)))
    .orderBy(asc(photos.createdAt));
  const urls = await signedPhotoUrls(rows.map((r) => r.storagePath));
  return rows.flatMap((r) => {
    const url = urls.get(r.storagePath);
    return url ? [{ id: r.id, url }] : [];
  });
}

// Checks the car, mod, or record belongs to the user and has room left.
async function checkTarget(userId: string, vehicleId: string, target: PhotoTarget) {
  if (!(await getVehicle(userId, vehicleId))) return "That car wasn't found.";
  if (target.kind === "mod" && !(await getMod(userId, vehicleId, target.id))) {
    return "That mod wasn't found.";
  }
  if (target.kind === "record" && !(await getServiceRecord(userId, vehicleId, target.id))) {
    return "That service record wasn't found.";
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(photos)
    .where(and(eq(photos.userId, userId), eq(photos.vehicleId, vehicleId), targetFilter(target)));
  const limit = PHOTO_LIMITS[target.kind];
  if (n >= limit) return `You can add up to ${limit} photos here.`;
  return null;
}

// Returns an error message, or null once the photo is saved.
export async function addPhoto(userId: string, vehicleId: string, target: PhotoTarget, file: File) {
  const problem = await checkTarget(userId, vehicleId, target);
  if (problem) return problem;

  let path: string;
  try {
    path = await uploadVehiclePhoto(userId, vehicleId, file);
  } catch {
    return "The photo didn't upload. Try again.";
  }
  await db.insert(photos).values({
    userId,
    vehicleId,
    modId: target.kind === "mod" ? target.id : null,
    serviceRecordId: target.kind === "record" ? target.id : null,
    storagePath: path,
  });
  return null;
}

export async function deletePhoto(userId: string, photoId: string) {
  if (!isUuid(photoId)) return;
  const [row] = await db
    .delete(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
    .returning({ path: photos.storagePath });
  if (row) await deleteVehiclePhoto(row.path);
}

// Deleting a mod or record removes its rows by cascade; call this first to
// clean up the files too.
export async function photoPathsFor(userId: string, target: PhotoTarget) {
  if (target.kind === "build") return [];
  const rows = await db
    .select({ path: photos.storagePath })
    .from(photos)
    .where(and(eq(photos.userId, userId), targetFilter(target)));
  return rows.map((r) => r.path);
}

export async function removePhotoFiles(paths: string[]) {
  if (paths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from("vehicle-photos").remove(paths);
}

export async function getPhotosByIds(userId: string, ids: string[]) {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), inArray(photos.id, valid)));
}
