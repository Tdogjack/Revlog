import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { mods, postPhotos, posts, profiles, vehicles } from "@/db/schema";
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
  title: posts.title,
  body: posts.body,
  createdAt: posts.createdAt,
  vehicleId: posts.vehicleId,
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
export async function listPosts({ before, username }: { before?: Date; username?: string } = {}) {
  const filters = [
    before ? lt(posts.createdAt, before) : undefined,
    username ? eq(profiles.username, username) : undefined,
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
    .select({ id: mods.id, brand: mods.brand, part: mods.part, category: mods.category })
    .from(mods)
    .where(and(eq(mods.vehicleId, vehicleId), eq(mods.status, "installed")))
    .orderBy(asc(mods.installedOn), asc(mods.createdAt));
}

export type NewPost = {
  vehicleId: string;
  modId: string | null;
  title: string;
  body: string | null;
  photoIds: string[];
};

// Returns the new post's id, or an error message.
export async function createPost(
  userId: string,
  input: NewPost,
): Promise<{ id: string } | { error: string }> {
  if (!(await getVehicle(userId, input.vehicleId))) return { error: "That car wasn't found." };
  if (input.modId && !(await getMod(userId, input.vehicleId, input.modId))) {
    return { error: "That mod wasn't found." };
  }
  // Only photos of this car (never receipts) can be shared.
  const chosen = (await getPhotosByIds(userId, input.photoIds.slice(0, MAX_POST_PHOTOS))).filter(
    (p) => p.vehicleId === input.vehicleId && !p.serviceRecordId,
  );

  const [post] = await db
    .insert(posts)
    .values({
      userId,
      vehicleId: input.vehicleId,
      modId: input.modId,
      kind: input.modId ? "mod" : "build",
      title: input.title,
      body: input.body,
    })
    .returning({ id: posts.id });

  // Shared photos are copied to the public bucket; the originals stay private.
  const supabase = await createClient();
  const copies: { storagePath: string; position: number }[] = [];
  for (const [position, photo] of chosen.entries()) {
    const ext = photo.storagePath.split(".").pop() ?? "webp";
    const target = `${userId}/${post.id}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("vehicle-photos")
      .copy(photo.storagePath, target, { destinationBucket: BUCKET });
    if (!error) copies.push({ storagePath: target, position });
  }
  if (copies.length) {
    await db.insert(postPhotos).values(copies.map((c) => ({ ...c, userId, postId: post.id })));
  }
  return { id: post.id };
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
