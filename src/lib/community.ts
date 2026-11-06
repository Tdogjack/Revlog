import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  accountSuspensions,
  contentReports,
  mods,
  parts,
  postComments,
  postLikes,
  postPhotos,
  posts,
  profiles,
  userBlocks,
  vehicles,
} from "@/db/schema";
import { getPhotosByIds } from "@/lib/gallery";
import { getMod } from "@/lib/mods";
import { isBlockedBy } from "@/lib/moderation";
import type { PostSort } from "@/lib/post-sorts";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getVehicle, isUuid } from "@/lib/vehicles";

const BUCKET = "community-photos";
export const MAX_POST_PHOTOS = 10;
export const FEED_PAGE = 20;
// Open reports from this many people hide content until a moderator looks.
const AUTO_HIDE_REPORTS = 3;

// The build on the landing page. If it's ever deleted, the best-liked build
// with photos takes its place.
const FEATURED_BUILD_ID = "465bc740-ec3e-4d88-bea6-c02797f292f3";
export const FEATURED_BUILD_TAG = "featured-build";

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

// What a viewer gets to see: nothing from suspended accounts, nothing held back
// by reports (authors still see their own, so they can edit or delete it), and
// nothing from people they blocked or that they reported themselves.
function visibleTo(
  kind: "post" | "comment",
  id: AnyPgColumn,
  authorId: AnyPgColumn,
  viewerId?: string,
) {
  const target = sql.raw(`'${kind}'`);
  const limit = sql.raw(String(AUTO_HIDE_REPORTS));
  const held = sql`(
    exists (select 1 from ${accountSuspensions} where ${accountSuspensions.userId} = ${authorId})
    or (select count(*) from ${contentReports}
        where ${contentReports.targetType} = ${target}
          and ${contentReports.targetId} = ${id}
          and ${contentReports.status} = 'open') >= ${limit}
  )`;
  if (!viewerId) return sql`not ${held}`;
  return and(
    or(eq(authorId, viewerId), sql`not ${held}`),
    sql`not exists (
      select 1 from ${userBlocks}
      where ${userBlocks.userId} = ${viewerId} and ${userBlocks.blockedUserId} = ${authorId}
    )`,
    sql`not exists (
      select 1 from ${contentReports}
      where ${contentReports.reporterId} = ${viewerId}
        and ${contentReports.targetType} = ${target}
        and ${contentReports.targetId} = ${id}
    )`,
  );
}

type PostRow = Awaited<ReturnType<typeof selectPosts>>[number];
export type FeedPost = PostRow & {
  photos: { id: string; url: string }[];
  likeCount: number;
  commentCount: number;
  // Whether the person viewing has liked it (false when signed out).
  liked: boolean;
};

function selectPosts() {
  return db
    .select(postFields)
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .innerJoin(vehicles, eq(vehicles.id, posts.vehicleId))
    .leftJoin(mods, eq(mods.id, posts.modId));
}

// Adds each post's photos, like and comment counts, and the viewer's like.
async function withExtras(rows: PostRow[], viewerId?: string): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [photoRows, likeRows, commentRows, mine] = await Promise.all([
    db
      .select()
      .from(postPhotos)
      .where(inArray(postPhotos.postId, ids))
      .orderBy(asc(postPhotos.position)),
    db
      .select({ postId: postLikes.postId, n: count() })
      .from(postLikes)
      .where(inArray(postLikes.postId, ids))
      .groupBy(postLikes.postId),
    db
      .select({ postId: postComments.postId, n: count() })
      .from(postComments)
      .where(
        and(
          inArray(postComments.postId, ids),
          visibleTo("comment", postComments.id, postComments.userId, viewerId),
        ),
      )
      .groupBy(postComments.postId),
    viewerId
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(inArray(postLikes.postId, ids), eq(postLikes.userId, viewerId)))
      : [],
  ]);
  return rows.map((r) => ({
    ...r,
    photos: photoRows
      .filter((p) => p.postId === r.id)
      .map((p) => ({ id: p.id, url: communityPhotoUrl(p.storagePath) })),
    likeCount: likeRows.find((l) => l.postId === r.id)?.n ?? 0,
    commentCount: commentRows.find((c) => c.postId === r.id)?.n ?? 0,
    liked: mine.some((m) => m.postId === r.id),
  }));
}

const likeTotal = sql<number>`(select count(*) from ${postLikes} where ${postLikes.postId} = ${posts.id})`;
const commentTotal = sql<number>`(select count(*) from ${postComments} where ${postComments.postId} = ${posts.id})`;
const engagement = sql<number>`(${likeTotal} + 2 * ${commentTotal})`;
const ageHours = sql<number>`(extract(epoch from now() - ${posts.createdAt}) / 3600)`;

// Hot fades engagement with age (the +1 lets brand-new posts in); Rising
// ranks recent posts by how fast they're picking up.
function sortOrder(sort: PostSort) {
  switch (sort) {
    case "best":
      return [desc(engagement), desc(posts.createdAt)];
    case "hot":
      return [desc(sql`(${engagement} + 1) / power(${ageHours} + 2, 1.5)`), desc(posts.createdAt)];
    case "top":
      return [desc(likeTotal), desc(posts.createdAt)];
    case "rising":
      return [desc(sql`${engagement} / (${ageHours} + 2)`), desc(posts.createdAt)];
    case "new":
      return [desc(posts.createdAt)];
  }
}

// Every word has to show up somewhere: the title, story, username, car, or mod.
function searchFilter(q: string) {
  const words = q
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^@/, ""))
    .filter(Boolean)
    .slice(0, 8);
  if (words.length === 0) return undefined;
  return and(
    ...words.map((word) => {
      // Typed % and _ match themselves, not any text.
      const pattern = `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      return or(
        ilike(posts.title, pattern),
        ilike(posts.body, pattern),
        ilike(profiles.username, pattern),
        ilike(vehicles.make, pattern),
        ilike(vehicles.model, pattern),
        ilike(vehicles.trim, pattern),
        ilike(vehicles.nickname, pattern),
        ilike(sql`${vehicles.year}::text`, pattern),
        ilike(mods.brand, pattern),
        ilike(mods.part, pattern),
      );
    }),
  );
}

// One page of posts in the chosen order (newest first by default).
export async function listPosts({
  sort = "new",
  page = 1,
  username,
  tag,
  q,
  viewerId,
  moderator = false,
}: {
  sort?: PostSort;
  page?: number;
  username?: string;
  tag?: string;
  q?: string;
  viewerId?: string;
  // Moderators reviewing a profile see what's hidden from everyone else.
  moderator?: boolean;
} = {}) {
  const filters = [
    moderator ? undefined : visibleTo("post", posts.id, posts.userId, viewerId),
    username ? eq(profiles.username, username) : undefined,
    tag ? eq(posts.tag, tag) : undefined,
    q ? searchFilter(q) : undefined,
    sort === "rising" ? sql`${posts.createdAt} > now() - interval '3 days'` : undefined,
  ].filter((f) => f !== undefined);
  const rows = await selectPosts()
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(...sortOrder(sort))
    .limit(FEED_PAGE)
    .offset((Math.max(1, page) - 1) * FEED_PAGE);
  return withExtras(rows, viewerId);
}

export async function getPost(postId: string, viewerId?: string, moderator = false) {
  if (!isUuid(postId)) return null;
  const rows = await selectPosts()
    .where(
      moderator
        ? eq(posts.id, postId)
        : and(eq(posts.id, postId), visibleTo("post", posts.id, posts.userId, viewerId)),
    )
    .limit(1);
  const [post] = await withExtras(rows, viewerId);
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

// Cached so the landing page stays prerendered. A failed read shows no build
// rather than breaking the page, and is retried within minutes.
export async function getFeaturedBuild() {
  "use cache";
  cacheTag(FEATURED_BUILD_TAG);
  try {
    const pinned = await getPost(FEATURED_BUILD_ID);
    const post = pinned?.photos.length
      ? pinned
      : (await listPosts({ tag: "build", sort: "best" })).find((p) => p.photos.length);
    cacheLife("hours");
    return post ?? null;
  } catch {
    cacheLife("minutes");
    return null;
  }
}

export async function hasLiked(userId: string, postId: string) {
  const [row] = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);
  return !!row;
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

async function postOwner(postId: string) {
  if (!isUuid(postId)) return null;
  const [row] = await db.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId));
  return row?.userId ?? null;
}

// Likes or unlikes a post. Returns the new state, or null if the post is gone
// or its owner blocked this person.
export async function setLike(userId: string, postId: string, liked: boolean) {
  const owner = await postOwner(postId);
  if (!owner) return null;
  if (liked) {
    if (await isBlockedBy(owner, userId)) return null;
    await db.insert(postLikes).values({ userId, postId }).onConflictDoNothing();
  } else {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));
  return { liked, likeCount: n };
}

export type PostComment = Awaited<ReturnType<typeof listComments>>[number];

// Oldest first, so a thread reads top to bottom.
export function listComments(postId: string, viewerId?: string, moderator = false) {
  return db
    .select({
      id: postComments.id,
      userId: postComments.userId,
      body: postComments.body,
      createdAt: postComments.createdAt,
      username: profiles.username,
    })
    .from(postComments)
    .innerJoin(profiles, eq(profiles.userId, postComments.userId))
    .where(
      moderator
        ? eq(postComments.postId, postId)
        : and(
            eq(postComments.postId, postId),
            visibleTo("comment", postComments.id, postComments.userId, viewerId),
          ),
    )
    .orderBy(asc(postComments.createdAt));
}

export async function addComment(userId: string, postId: string, body: string) {
  const owner = await postOwner(postId);
  if (!owner) return "That post wasn't found.";
  if (await isBlockedBy(owner, userId)) return "You can't comment on this post.";
  await db.insert(postComments).values({ userId, postId, body });
  return null;
}

// The commenter or the post's owner can remove a comment. Returns the post's
// id once it's removed.
export async function deleteComment(userId: string, commentId: string) {
  if (!isUuid(commentId)) return null;
  const [row] = await db
    .select({ postId: postComments.postId, author: postComments.userId, owner: posts.userId })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(eq(postComments.id, commentId));
  if (!row || (row.author !== userId && row.owner !== userId)) return null;
  await db.delete(postComments).where(eq(postComments.id, commentId));
  return row.postId;
}

// Comments someone left in the last day, for rate limiting.
export async function countRecentComments(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(postComments)
    .where(and(eq(postComments.userId, userId), gt(postComments.createdAt, since)));
  return n;
}
