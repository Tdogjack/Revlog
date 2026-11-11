import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { makeThumb, thumbPathOf } from "@/lib/thumbnails";

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
  await uploadThumb(BUCKET, path, photo);
  return path;
}

// Saves the small copy beside a photo. A failure here only means grids show
// the full photo, so it never stops the upload.
export async function uploadThumb(bucket: string, path: string, photo: Blob) {
  try {
    const supabase = await createClient();
    await supabase.storage.from(bucket).upload(thumbPathOf(path), await makeThumb(photo), {
      contentType: "image/webp",
      cacheControl: "31536000",
    });
  } catch {
    // Grids fall back to the full photo.
  }
}

// Every file a photo is stored as: the photo and its small copy.
export const withThumbs = (paths: string[]) => paths.flatMap((p) => [p, thumbPathOf(p)]);

export async function deleteVehiclePhoto(path: string) {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove(withThumbs([path]));
}

// Removes every photo under the user's folder (<user_id>/<folder>/<file>) in
// the private car photos bucket and the public community bucket.
export async function deleteAllPhotos(userId: string) {
  await deleteUserFolder(BUCKET, userId);
  await deleteUserFolder("community-photos", userId);
}

async function deleteUserFolder(bucketName: string, userId: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(bucketName);
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

// Signed links last an hour. Each one is kept on the server and handed out
// again for up to 45 minutes (so it always has 15 or more left), which gives
// browsers the same address on every visit: they show the photo they already
// downloaded instead of fetching it again.
const SIGNED_FOR = 60 * 60;

// One photo's signed link, made with the secret key so it can be cached apart
// from any one visitor. Only ever called with paths already looked up for the
// signed-in owner. Missing files (like an old photo with no small copy) throw,
// so nothing is cached for them.
async function cachedSignedUrl(path: string): Promise<string> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 40 * 60, expire: 45 * 60 });
  const admin = createAdminClient();
  if (!admin) throw new Error("No secret key");
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_FOR);
  if (error || !data?.signedUrl) throw error ?? new Error("Not signed");
  return data.signedUrl;
}

const hasSecretKey = () =>
  !!(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);

// Signed links by path, leaving out any that couldn't be made.
async function signPaths(paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  if (hasSecretKey()) {
    const links = await Promise.all(paths.map((p) => cachedSignedUrl(p).catch(() => null)));
    for (const [i, link] of links.entries()) if (link) urls.set(paths[i], link);
    return urls;
  }

  // Without the secret key, sign fresh links as the visitor (not reused).
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_FOR);
  for (const [i, item] of (data ?? []).entries()) {
    if (!item.error && item.signedUrl) urls.set(paths[i], item.signedUrl);
  }
  return urls;
}

// Links to the small copies, by the full photo's path. Photos saved before
// small copies existed aren't in the map; show the full photo for those.
export async function signedThumbUrls(paths: (string | null)[]) {
  const wanted = paths.filter((p): p is string => !!p);
  const byThumb = await signPaths(wanted.map(thumbPathOf));
  const urls = new Map<string, string>();
  for (const path of wanted) {
    const link = byThumb.get(thumbPathOf(path));
    if (link) urls.set(path, link);
  }
  return urls;
}

// Private bucket, so photos are shown through short-lived signed links.
export async function signedPhotoUrls(paths: (string | null)[]) {
  return signPaths(paths.filter((p): p is string => !!p));
}
