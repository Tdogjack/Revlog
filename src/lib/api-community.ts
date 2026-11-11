import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { fail } from "@/lib/api";
import type { FeedPost as ApiPost } from "@/lib/api-types";
import { FEATURED_BUILD_TAG, type FeedPost } from "@/lib/community";
import { isModerator } from "@/lib/moderation";
import { postTagLabel } from "@/lib/post-tags";
import { vehicleName } from "@/lib/vehicles";

// Likes, comments, and removals can all change the feed and the landing page.
export function refreshCommunity() {
  revalidateTag(FEATURED_BUILD_TAG, "max");
  revalidatePath("/community");
}

// 409 is how the app knows to ask for a username, then try again.
export const postingFailure = (result: { error: string } | { needsUsername: true }) =>
  "needsUsername" in result ? fail("Choose a username first.", 409) : fail(result.error);

// Anyone else gets the same answer as a route that doesn't exist.
export const notModerator = (userId: string) =>
  isModerator(userId) ? null : fail("That wasn't found.", 404);

export const postView = (post: FeedPost): ApiPost => ({
  id: post.id,
  userId: post.userId,
  username: post.username,
  tag: post.tag,
  tagLabel: postTagLabel(post.tag),
  title: post.title,
  body: post.body,
  createdAt: post.createdAt.toISOString(),
  carName: vehicleName(post),
  modName: post.modPart ? [post.modBrand, post.modPart].filter(Boolean).join(" ") : null,
  vehicleId: post.vehicleId,
  modId: post.modId,
  showParts: post.showParts,
  photos: post.photos,
  likeCount: post.likeCount,
  commentCount: post.commentCount,
  liked: post.liked,
});
