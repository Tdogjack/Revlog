import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { mods, parts, postPhotos, posts, profiles, vehicles } from "@/db/schema";
import { getPhotosByIds } from "@/lib/gallery";
import { getMod } from "@/lib/mods";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getVehicle, isUuid } from "@/lib/vehicles";

const BUCKET = "community-photos";
export const MAX_POST_PHOTOS = 10;
export const FEED_PAGE = 20;

// The bucket is public, so photo links are plain URLs that never expire.
export function communityPhotoUrl(path: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

const postFields = {
  id: posts.id,
  userId: posts.userId,
  kind: posts.kind,
  tag: posts.tag,
  title: posts.title,
  body: posts.body,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  vehicleId: posts.vehicleId,
  modId: posts.modId,
  showParts: posts.showParts,
  username: profiles.username,
  year: vehicles.year,
  make: vehicles.make,
  model: vehicles.model,
  trim: vehicles.trim,
  nickname: vehicles.nickname,
  modBrand: mods.brand,
  modPart: mods.part,
  modCategory: mods.category,
};

type PostRow = Awaited<ReturnType<typeof selectPosts>>[number];
export type FeedPost = PostRow & { photos: { id: string; url: string }[] };

function selectPosts() {
  return db
    .select(postFields)
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .innerJoin(vehicles, eq(vehicles.id, posts.vehicleId))
    .leftJoin(mods, eq(mods.id, posts.modId));
}

async function withPhotos(rows: PostRow[]): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const photoRows = await db
    .select()
    .from(postPhotos)
    .where(
      inArray(
        postPhotos.postId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(postPhotos.position));
  return rows.map((r) => ({
    ...r,
    photos: photoRows
      .filter((p) => p.postId === r.id)
      .map((p) => ({ id: p.id, url: communityPhotoUrl(p.storagePath) })),
  }));
}

// Newest first. `before` pages back through older posts.
export async function listPosts({
  before,
  username,
  tag,
}: { before?: Date; username?: string; tag?: string } = {}) {
  const filters = [
    before ? lt(posts.createdAt, before) : undefined,
    username ? eq(profiles.username, username) : undefined,
    tag ? eq(posts.tag, tag) : undefined,
  ].filter((f) => f !== undefined);
  const rows = await selectPosts()
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(FEED_PAGE);
  return withPhotos(rows);
}

export async function getPost(postId: string) {
  if (!isUuid(postId)) return null;
  const rows = await selectPosts().where(eq(posts.id, postId)).limit(1);
  const [post] = await withPhotos(rows);
  return post ?? null;
}

// The car's installed mods, shown under build posts so the list stays current.
export function listInstalledMods(vehicleId: string) {
  return db
    .select({
      id: mods.id,
      brand: mods.brand,
      part: mods.part,
      category: mods.category,
    })
    .from(mods)
    .where(and(eq(mods.vehicleId, vehicleId), eq(mods.status, "installed")))
    .orderBy(asc(mods.installedOn), asc(mods.createdAt));
}

// The car's public build post, if it has one.
export async function getBuildPostId(userId: string, vehicleId: string) {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.vehicleId, vehicleId), eq(posts.tag, "build")))
    .limit(1);
  return row?.id ?? null;
}

export type NewPost = {
  vehicleId: string;
  modId: string | null;
  title: string;
  body: string | null;
  photoIds: string[];
  showParts: boolean;
  tag: string;
};

// The parts a post shares when the poster chose to: the mod's parts for a
// mod post, or the parts of every installed mod for a build post.
export async function listPostParts(post: FeedPost) {
  if (!post.showParts) return [];
  const fields = {
    id: parts.id,
    modId: parts.modId,
    name: parts.name,
    url: parts.url,
    quantity: parts.quantity,
    price: parts.price,
    currency: parts.currency,
  };
  if (post.kind === "mod") {
    if (!post.modId) return [];
    return db
      .select(fields)
      .from(parts)
      .where(and(eq(parts.userId, post.userId), eq(parts.modId, post.modId)))
      .orderBy(asc(parts.createdAt));
  }
  return db
    .select(fields)
    .from(parts)
    .innerJoin(mods, eq(mods.id, parts.modId))
    .where(
      and(
        eq(parts.userId, post.userId),
        eq(parts.vehicleId, post.vehicleId),
        eq(mods.status, "installed"),
      ),
    )
    .orderBy(asc(parts.createdAt));
}

// How many parts a new post would list, for the share form.
export async function countShareableParts(userId: string, vehicleId: string, modId: string | null) {
  const where = modId
    ? and(eq(parts.userId, userId), eq(parts.modId, modId))
    : and(eq(parts.userId, userId), eq(parts.vehicleId, vehicleId), eq(mods.status, "installed"));
  const rows = await db
    .select({ id: parts.id })
    .from(parts)
    .innerJoin(mods, eq(mods.id, parts.modId))
    .where(where);
  return rows.length;
}

// Only photos of this car (never receipts) can be shared.
async function shareableGaragePhotos(
  userId: string,
  vehicleId: string,
  ids: string[],
  max: number,
) {
  if (max <= 0) return [];
  return (await getPhotosByIds(userId, ids.slice(0, max))).filter(
    (p) => p.vehicleId === vehicleId && !p.serviceRecordId,
  );
}

// Shared photos are copied to the public bucket; the originals stay private.
async function copyToPost(
  userId: string,
  postId: string,
  chosen: { storagePath: string }[],
  startAt: number,
) {
  const supabase = await createClient();
  const copies: { storagePath: string; position: number }[] = [];
  for (const [i, photo] of chosen.entries()) {
    const ext = photo.storagePath.split(".").pop() ?? "webp";
    const target = `${userId}/${postId}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("vehicle-photos")
      .copy(photo.storagePath, target, { destinationBucket: BUCKET });
    if (!error) copies.push({ storagePath: target, position: startAt + i });
  }
  if (copies.length) {
    await db.insert(postPhotos).values(copies.map((c) => ({ ...c, userId, postId })));
  }
}

const isUniqueViolation = (err: unknown) =>
  (err as { code?: string })?.code === "23505" ||
  (err as { cause?: { code?: string } })?.cause?.code === "23505";

// Returns the new post's id, or an error message.
export async function createPost(
  userId: string,
  input: NewPost,
): Promise<{ id: string } | { error: string }> {
  if (!(await getVehicle(userId, input.vehicleId))) return { error: "That car wasn't found." };
  if (input.modId && !(await getMod(userId, input.vehicleId, input.modId))) {
    return { error: "That mod wasn't found." };
  }
  if (input.tag === "build" && input.modId) return { error: "Builds are shared from the car." };
  const chosen = await shareableGaragePhotos(
    userId,
    input.vehicleId,
    input.photoIds,
    MAX_POST_PHOTOS,
  );

  let post: { id: string };
  try {
    [post] = await db
      .insert(posts)
      .values({
        userId,
        vehicleId: input.vehicleId,
        modId: input.modId,
        kind: input.modId ? "mod" : "build",
        tag: input.tag,
        title: input.title,
        body: input.body,
        showParts: input.showParts,
      })
      .returning({ id: posts.id });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "This car already has a public build." };
    throw err;
  }

  await copyToPost(userId, post.id, chosen, 0);
  return { id: post.id };
}

export type BuildUpdate = {
  title: string;
  body: string | null;
  showParts: boolean;
  // Photos already on the post to keep, in order; the rest are removed.
  keepPhotoIds: string[];
  // Garage photos to add after the kept ones.
  photoIds: string[];
};

// Edits a public build in place. Returns an error message, or null.
export async function updateBuildPost(userId: string, postId: string, input: BuildUpdate) {
  if (!isUuid(postId)) return "That build wasn't found.";
  const [post] = await db
    .select({ id: posts.id, vehicleId: posts.vehicleId })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId), eq(posts.tag, "build")));
  if (!post) return "That build wasn't found.";

  const current = await db
    .select({ id: postPhotos.id, storagePath: postPhotos.storagePath })
    .from(postPhotos)
    .where(eq(postPhotos.postId, postId))
    .orderBy(asc(postPhotos.position));
  const kept = current.filter((p) => input.keepPhotoIds.includes(p.id));
  const dropped = current.filter((p) => !input.keepPhotoIds.includes(p.id));
  const chosen = await shareableGaragePhotos(
    userId,
    post.vehicleId,
    input.photoIds,
    MAX_POST_PHOTOS - kept.length,
  );

  await db
    .update(posts)
    .set({ title: input.title, body: input.body, showParts: input.showParts })
    .where(eq(posts.id, postId));
  if (dropped.length) {
    await db.delete(postPhotos).where(
      inArray(
        postPhotos.id,
        dropped.map((p) => p.id),
      ),
    );
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove(dropped.map((p) => p.storagePath));
  }
  for (const [position, photo] of kept.entries()) {
    await db.update(postPhotos).set({ position }).where(eq(postPhotos.id, photo.id));
  }
  await copyToPost(userId, postId, chosen, kept.length);
  return null;
}

// A photo uploaded just for a post (not saved to the garage). Returns an
// error message, or null once it's added after the post's other photos.
export async function addPostPhoto(userId: string, postId: string, file: File) {
  if (!isUuid(postId)) return "That post wasn't found.";
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
  if (!post) return "That post wasn't found.";
  const existing = await db
    .select({ position: postPhotos.position })
    .from(postPhotos)
    .where(eq(postPhotos.postId, postId));
  if (existing.length >= MAX_POST_PHOTOS) return `Posts can have up to ${MAX_POST_PHOTOS} photos.`;

  const ext = file.type.split("/")[1];
  const path = `${userId}/${postId}/${randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return "A photo didn't upload. Try again.";

  const position = Math.max(-1, ...existing.map((p) => p.position)) + 1;
  await db.insert(postPhotos).values({ userId, postId, storagePath: path, position });
  return null;
}

export async function deletePost(userId: string, postId: string) {
  if (!isUuid(postId)) return;
  const files = await db
    .select({ path: postPhotos.storagePath })
    .from(postPhotos)
    .where(and(eq(postPhotos.postId, postId), eq(postPhotos.userId, userId)));
  const [deleted] = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .returning({ id: posts.id });
  if (deleted && files.length) {
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove(files.map((f) => f.path));
  }
}
