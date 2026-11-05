"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getUser, requireUser } from "@/lib/auth";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";
import {
  addComment,
  addPostPhoto,
  countRecentComments,
  createPost,
  deleteComment,
  deletePost,
  FEATURED_BUILD_TAG,
  getBuildPostId,
  setLike,
  updateBuildPost,
} from "@/lib/community";
import { readPhoto } from "@/lib/photos";
import { isPostTag } from "@/lib/post-tags";
import { getProfile } from "@/lib/profiles";
import { isUuid } from "@/lib/vehicles";

export type PostFormState =
  { error?: string; values?: Record<string, string>; postId?: string } | undefined;

const POSTS_PER_DAY = 10;
const COMMENTS_PER_DAY = 100;

export async function sharePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  if (!(await getProfile(user.id))) redirect("/username?next=/community");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const modId = String(formData.get("modId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  // The build tag is only for the car's public build, which saveBuild handles.
  const rawTag = String(formData.get("tag") ?? "");
  const tag = isPostTag(rawTag) && rawTag !== "build" ? rawTag : modId ? "mod" : "progress";
  const values = { title, body, tag };
  if (!isUuid(vehicleId) || (modId && !isUuid(modId))) return { error: "Pick a car to share." };
  const invalid = checkText(title, body);
  if (invalid) return { error: invalid, values };

  if (await atDailyLimit(user.id))
    return { error: "That's the limit for today. Try again tomorrow.", values };

  const result = await createPost(user.id, {
    vehicleId,
    modId,
    title,
    body: body || null,
    photoIds: formData.getAll("photoIds").map(String),
    showParts: formData.get("showParts") === "on",
    tag,
  });
  if ("error" in result) return { error: result.error, values };

  // The form uploads any new photos to the post, then opens it.
  revalidatePath("/community");
  return { postId: result.id };
}

// Posts the car's public build, or updates it if the car already has one.
export async function saveBuild(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  if (!(await getProfile(user.id))) redirect("/username?next=/community");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };
  if (!isUuid(vehicleId)) return { error: "Pick a car to share." };
  const invalid = checkText(title, body);
  if (invalid) return { error: invalid, values };
  const showParts = formData.get("showParts") === "on";
  const photoIds = formData.getAll("photoIds").map(String);

  const existing = await getBuildPostId(user.id, vehicleId);
  if (existing) {
    const error = await updateBuildPost(user.id, existing, {
      title,
      body: body || null,
      showParts,
      keepPhotoIds: formData.getAll("keepPhotoIds").map(String),
      photoIds,
    });
    if (error) return { error, values };
    updateTag(FEATURED_BUILD_TAG);
    revalidatePath("/community");
    revalidatePath(`/community/${existing}`);
    revalidatePath(`/garage/${vehicleId}`);
    return { postId: existing };
  }

  if (await atDailyLimit(user.id))
    return { error: "That's the limit for today. Try again tomorrow.", values };
  const result = await createPost(user.id, {
    vehicleId,
    modId: null,
    title,
    body: body || null,
    photoIds,
    showParts,
    tag: "build",
  });
  if ("error" in result) return { error: result.error, values };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/garage/${vehicleId}`);
  return { postId: result.id };
}

function checkText(title: string, body: string) {
  if (!title) return "Give your post a title.";
  if (title.length > 120) return "Keep the title under 120 characters.";
  if (body.length > 4000) return "Keep the post under 4,000 characters.";
  return null;
}

async function atDailyLimit(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(posts)
    .where(and(eq(posts.userId, userId), gt(posts.createdAt, since)));
  return n >= POSTS_PER_DAY;
}

// One new photo per call, so each request stays under the upload size limit.
export async function uploadPostPhoto(postId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await isEmailVerified(user.id))) return { error: CONFIRM_EMAIL_FIRST };
  const photo = readPhoto(formData);
  if (!photo) return { error: "Choose a photo first." };
  if ("error" in photo) return { error: photo.error };
  const error = await addPostPhoto(user.id, postId, photo);
  if (error) return { error };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath(`/community/${postId}`);
  return {};
}

// `next` is where to land afterwards: the feed, or the car's page when a build
// is taken down from the garage.
export async function removePost(postId: string, next: string) {
  const user = await requireUser();
  await deletePost(user.id, postId);
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  if (next !== "/community") revalidatePath(next);
  redirect(next.startsWith("/garage/") ? next : "/community");
}

// Signed-out visitors get null, and the button sends them to log in.
export async function toggleLike(postId: string, liked: boolean) {
  const user = await getUser();
  if (!user) return null;
  const result = await setLike(user.id, postId, liked);
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return result;
}

export type CommentFormState = { error?: string; body?: string } | undefined;

export async function postComment(
  postId: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const user = await requireUser();
  if (!(await getProfile(user.id))) redirect(`/username?next=/community/${postId}`);
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a comment first." };
  if (body.length > 1000) return { error: "Keep comments under 1,000 characters.", body };
  if ((await countRecentComments(user.id)) >= COMMENTS_PER_DAY)
    return { error: "That's the comment limit for today. Try again tomorrow.", body };
  const error = await addComment(user.id, postId, body);
  if (error) return { error, body };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return {};
}

export async function removeComment(commentId: string) {
  const user = await requireUser();
  const postId = await deleteComment(user.id, commentId);
  if (!postId) return;
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}
