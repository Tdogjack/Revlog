"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addPostPhoto, createPost, deletePost } from "@/lib/community";
import { readPhoto } from "@/lib/photos";
import { getProfile } from "@/lib/profiles";
import { isUuid } from "@/lib/vehicles";

export type PostFormState =
  { error?: string; values?: Record<string, string>; postId?: string } | undefined;

const POSTS_PER_DAY = 10;

export async function sharePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  if (!(await getProfile(user.id))) redirect("/username?next=/community");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const modId = String(formData.get("modId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };
  if (!isUuid(vehicleId) || (modId && !isUuid(modId))) return { error: "Pick a car to share." };
  if (!title) return { error: "Give your post a title.", values };
  if (title.length > 120) return { error: "Keep the title under 120 characters.", values };
  if (body.length > 4000) return { error: "Keep the post under 4,000 characters.", values };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(posts)
    .where(and(eq(posts.userId, user.id), gt(posts.createdAt, since)));
  if (n >= POSTS_PER_DAY)
    return { error: "That's the limit for today. Try again tomorrow.", values };

  const result = await createPost(user.id, {
    vehicleId,
    modId,
    title,
    body: body || null,
    photoIds: formData.getAll("photoIds").map(String),
  });
  if ("error" in result) return { error: result.error, values };

  // The form uploads any new photos to the post, then opens it.
  revalidatePath("/community");
  return { postId: result.id };
}

// One new photo per call, so each request stays under the upload size limit.
export async function uploadPostPhoto(postId: string, formData: FormData) {
  const user = await requireUser();
  const photo = readPhoto(formData);
  if (!photo) return { error: "Choose a photo first." };
  if ("error" in photo) return { error: photo.error };
  const error = await addPostPhoto(user.id, postId, photo);
  if (error) return { error };
  revalidatePath(`/community/${postId}`);
  return {};
}

export async function removePost(postId: string) {
  const user = await requireUser();
  await deletePost(user.id, postId);
  revalidatePath("/community");
  redirect("/community");
}
