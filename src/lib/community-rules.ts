import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { addComment, addPostPhoto, countRecentComments, createPost, setLike } from "@/lib/community";
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
): Promise<Blocked | { id: string }> {
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
// Returns an error message, or null once saved.
export async function savePostPhoto(userId: string, postId: string, formData: FormData) {
  if (!(await isEmailVerified(userId))) return CONFIRM_EMAIL_FIRST;
  if (await isSuspended(userId)) return SUSPENDED_MESSAGE;
  const photo = readPhoto(formData);
  if (!photo) return "Choose a photo first.";
  if ("error" in photo) return photo.error;
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
