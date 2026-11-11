import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import {
  addComment,
  addPostPhoto,
  countRecentComments,
  createPost,
  getBuildPostId,
  reorderPostPhotos,
  setLike,
  updateBuildPost,
  updatePost,
  type AddedPhotos,
} from "@/lib/community";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";
import { createReport, isSuspended, SUSPENDED_MESSAGE } from "@/lib/moderation";
import { readPhoto } from "@/lib/photos";
import { isPostTag } from "@/lib/post-tags";
import { getProfile } from "@/lib/profiles";
import { isReportReason, type ReportKind } from "@/lib/report-reasons";
import { BLOCKED_WORDING, hasBlockedWords } from "@/lib/text-filter";
import { isUuid } from "@/lib/vehicles";

// What everyone posting to the community goes through, on the website and in
// the phone app, so a rule can't apply to only one of them.

const POSTS_PER_DAY = 10;
const COMMENTS_PER_DAY = 100;

export function checkPostText(title: string, body: string) {
  if (!title) return "Give your post a title.";
  if (title.length > 120) return "Keep the title under 120 characters.";
  if (body.length > 4000) return "Keep the post under 4,000 characters.";
  if (hasBlockedWords(`${title}\n${body}`)) return BLOCKED_WORDING;
  return null;
}

export async function atPostLimit(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(posts)
    .where(and(eq(posts.userId, userId), gt(posts.createdAt, since)));
  return n >= POSTS_PER_DAY;
}

export const POST_LIMIT_REACHED = "That's the limit for today. Try again tomorrow.";

type Blocked = { error: string } | { needsUsername: true };
type Saved = { id: string; added: AddedPhotos };

// Whether this account may post at all. Null means it can.
export async function postingProblem(userId: string): Promise<Blocked | null> {
  if (!(await getProfile(userId))) return { needsUsername: true };
  if (await isSuspended(userId)) return { error: SUSPENDED_MESSAGE };
  return null;
}

export async function publishPost(
  userId: string,
  input: {
    vehicleId: string;
    modId: string | null;
    title: string;
    body: string;
    tag: string;
    photoIds: string[];
    showParts: boolean;
  },
): Promise<Blocked | Saved> {
  const problem = await postingProblem(userId);
  if (problem) return problem;

  const { vehicleId, modId, title, body } = input;
  // The build tag is only for the car's public build, which saveBuild handles.
  const tag =
    isPostTag(input.tag) && input.tag !== "build" ? input.tag : modId ? "mod" : "progress";
  if (!isUuid(vehicleId) || (modId && !isUuid(modId))) return { error: "Pick a car to share." };
  const invalid = checkPostText(title, body);
  if (invalid) return { error: invalid };
  if (await atPostLimit(userId)) return { error: POST_LIMIT_REACHED };

  return createPost(userId, { ...input, tag, body: body || null });
}

// Posts a car's public build, or updates it if the car already has one.
export async function publishBuild(
  userId: string,
  input: {
    vehicleId: string;
    title: string;
    body: string;
    showParts: boolean;
    photoIds: string[];
    keepPhotoIds: string[];
  },
): Promise<Blocked | Saved> {
  const problem = await postingProblem(userId);
  if (problem) return problem;

  const { vehicleId, title, body, showParts, photoIds, keepPhotoIds } = input;
  if (!isUuid(vehicleId)) return { error: "Pick a car to share." };
  const invalid = checkPostText(title, body);
  if (invalid) return { error: invalid };

  const existing = await getBuildPostId(userId, vehicleId);
  if (existing) {
    const result = await updateBuildPost(userId, existing, {
      title,
      body: body || null,
      showParts,
      keepPhotoIds,
      photoIds,
    });
    return "error" in result ? result : { id: existing, added: result.added };
  }

  if (await atPostLimit(userId)) return { error: POST_LIMIT_REACHED };
  return createPost(userId, {
    vehicleId,
    modId: null,
    title,
    body: body || null,
    photoIds,
    showParts,
    tag: "build",
  });
}

// Edits one of the person's posts: words, tag, part links, and photos.
export async function editPost(
  userId: string,
  postId: string,
  input: {
    title: string;
    body: string;
    tag: string;
    showParts: boolean;
    photoIds: string[];
    keepPhotoIds: string[];
  },
): Promise<Blocked | Saved> {
  const problem = await postingProblem(userId);
  if (problem) return problem;
  const invalid = checkPostText(input.title, input.body);
  if (invalid) return { error: invalid };
  const result = await updatePost(userId, postId, {
    title: input.title,
    body: input.body || null,
    tag: isPostTag(input.tag) ? input.tag : null,
    showParts: input.showParts,
    photoIds: input.photoIds,
    keepPhotoIds: input.keepPhotoIds,
  });
  return "error" in result ? result : { id: postId, added: result.added };
}

// Puts a post's photos in order. Returns an error message, or null.
export async function orderPostPhotos(userId: string, postId: string, order: string[]) {
  if (await isSuspended(userId)) return SUSPENDED_MESSAGE;
  return reorderPostPhotos(userId, postId, order.filter(isUuid));
}

export async function publishComment(
  userId: string,
  postId: string,
  body: string,
): Promise<Blocked | null> {
  const problem = await postingProblem(userId);
  if (problem) return problem;
  if (!body) return { error: "Write a comment first." };
  if (body.length > 1000) return { error: "Keep comments under 1,000 characters." };
  if (hasBlockedWords(body)) return { error: BLOCKED_WORDING };
  if ((await countRecentComments(userId)) >= COMMENTS_PER_DAY) {
    return { error: "That's the comment limit for today. Try again tomorrow." };
  }
  const error = await addComment(userId, postId, body);
  return error ? { error } : null;
}

// One new photo per call, so each request stays under the upload size limit.
// Returns the new photo's id, or an error message.
export async function savePostPhoto(
  userId: string,
  postId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  if (!(await isEmailVerified(userId))) return { error: CONFIRM_EMAIL_FIRST };
  if (await isSuspended(userId)) return { error: SUSPENDED_MESSAGE };
  const photo = readPhoto(formData);
  if (!photo) return { error: "Choose a photo first." };
  if ("error" in photo) return photo;
  return addPostPhoto(userId, postId, photo);
}

// Null when the account is suspended or the post can't be liked.
export async function likePost(userId: string, postId: string, liked: boolean) {
  if (await isSuspended(userId)) return null;
  return setLike(userId, postId, liked);
}

// Returns an error message, or null once the report is filed.
export async function fileReport(
  userId: string,
  kind: ReportKind,
  targetId: string,
  reason: string,
  details: string,
) {
  if (!isReportReason(reason)) return "Pick a reason for the report.";
  if (details.length > 1000) return "Keep the details under 1,000 characters.";
  return createReport(userId, kind, targetId, reason, details || null);
}
