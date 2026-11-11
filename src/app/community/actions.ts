"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/auth";
import { deleteComment, deletePost, FEATURED_BUILD_TAG } from "@/lib/community";
import {
  editPost,
  fileReport,
  likePost,
  orderPostPhotos,
  publishBuild,
  publishComment,
  publishPost,
  savePostPhoto,
} from "@/lib/community-rules";
import { blockUser, unblockUser } from "@/lib/moderation";
import type { ReportKind } from "@/lib/report-reasons";

export type PostFormState =
  | {
      error?: string;
      values?: Record<string, string>;
      postId?: string;
      // Which post photo each chosen garage photo became.
      added?: Record<string, string>;
    }
  | undefined;

export async function sharePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tag = String(formData.get("tag") ?? "");
  const values = { title, body, tag };

  const result = await publishPost(user.id, {
    vehicleId: String(formData.get("vehicleId") ?? ""),
    modId: String(formData.get("modId") ?? "") || null,
    title,
    body,
    tag,
    photoIds: formData.getAll("photoIds").map(String),
    showParts: formData.get("showParts") === "on",
  });
  if ("needsUsername" in result) redirect("/username?next=/community");
  if ("error" in result) return { error: result.error, values };

  // The form uploads any new photos to the post, then opens it.
  revalidatePath("/community");
  return { postId: result.id, added: result.added };
}

// Saves changes to one of the person's posts.
export async function savePostEdits(
  postId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tag = String(formData.get("tag") ?? "");
  const values = { title, body, tag };

  const result = await editPost(user.id, postId, {
    title,
    body,
    tag,
    showParts: formData.get("showParts") === "on",
    photoIds: formData.getAll("photoIds").map(String),
    keepPhotoIds: formData.getAll("keepPhotoIds").map(String),
  });
  if ("needsUsername" in result) redirect("/username?next=/community");
  if ("error" in result) return { error: result.error, values };

  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { postId, added: result.added };
}

// Puts a post's photos in the order the form shows them.
export async function orderPhotos(postId: string, order: string[]) {
  const user = await requireUser();
  const error = await orderPostPhotos(user.id, postId, order);
  if (error) return { error };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return {};
}

// Posts the car's public build, or updates it if the car already has one.
export async function saveBuild(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };

  const result = await publishBuild(user.id, {
    vehicleId,
    title,
    body,
    showParts: formData.get("showParts") === "on",
    photoIds: formData.getAll("photoIds").map(String),
    keepPhotoIds: formData.getAll("keepPhotoIds").map(String),
  });
  if ("needsUsername" in result) redirect("/username?next=/community");
  if ("error" in result) return { error: result.error, values };

  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${result.id}`);
  revalidatePath(`/garage/${vehicleId}`);
  return { postId: result.id, added: result.added };
}

// One new photo per call, so each request stays under the upload size limit.
export async function uploadPostPhoto(postId: string, formData: FormData) {
  const user = await requireUser();
  const result = await savePostPhoto(user.id, postId, formData);
  if ("error" in result) return { error: result.error };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath(`/community/${postId}`);
  return { id: result.id };
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
  const result = await likePost(user.id, postId, liked);
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
  const body = String(formData.get("body") ?? "").trim();
  const problem = await publishComment(user.id, postId, body);
  if (problem && "needsUsername" in problem) redirect(`/username?next=/community/${postId}`);
  if (problem) return { error: problem.error, body };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return {};
}

export type ReportFormState = { error?: string; sent?: boolean } | undefined;

// Leaves the page alone so the sheet can confirm; finishReport refreshes it.
export async function reportContent(
  kind: ReportKind,
  targetId: string,
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  const error = await fileReport(user.id, kind, targetId, reason, details);
  return error ? { error } : { sent: true };
}

// Reports can hide a post, so the feed and the landing page's build refresh.
export async function finishReport() {
  await requireUser();
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
}

export async function blockAccount(userId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const error = await blockUser(user.id, userId);
  if (error) return { error };
  revalidatePath("/", "layout");
  return {};
}

export async function unblockAccount(userId: string) {
  const user = await requireUser();
  await unblockUser(user.id, userId);
  revalidatePath("/", "layout");
}

export async function removeComment(commentId: string) {
  const user = await requireUser();
  const postId = await deleteComment(user.id, commentId);
  if (!postId) return;
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}
