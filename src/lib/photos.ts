import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-photos";
const MAX_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

// Returns the photo from a form, null if none was chosen, or an error message.
export function readPhoto(formData: FormData): File | null | { error: string } {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return null;
  if (!ALLOWED_TYPES.has(photo.type)) return { error: "Use a JPG, PNG, or WebP photo." };
  if (photo.size > MAX_BYTES) return { error: "That photo is too large. Try a smaller one." };
  return photo;
}

// Uploads as the signed-in user, so storage rules keep files in their own folder.
export async function uploadVehiclePhoto(userId: string, vehicleId: string, photo: File) {
  const ext = photo.type.split("/")[1];
  const path = `${userId}/${vehicleId}/${randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo, { contentType: photo.type, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

export async function deleteVehiclePhoto(path: string) {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

// Removes every photo under the user's folder (<user_id>/<vehicle_id>/<file>).
export async function deleteAllPhotos(userId: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(BUCKET);
  const { data: folders, error } = await bucket.list(userId, { limit: 1000 });
  if (error) throw error;
  for (const folder of folders ?? []) {
    const { data: files, error: listError } = await bucket.list(`${userId}/${folder.name}`, {
      limit: 1000,
    });
    if (listError) throw listError;
    const paths = (files ?? []).map((f) => `${userId}/${folder.name}/${f.name}`);
    if (paths.length) {
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) throw removeError;
    }
  }
}

// Private bucket, so photos are shown through short-lived signed links.
export async function signedPhotoUrls(paths: (string | null)[]) {
  const wanted = paths.filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (wanted.length === 0) return urls;

  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(wanted, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
