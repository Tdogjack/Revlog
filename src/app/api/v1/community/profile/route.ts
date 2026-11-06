import { authed, fail, ok } from "@/lib/api";
import { postView } from "@/lib/api-community";
import type { CommunityProfile } from "@/lib/api-types";
import { listPosts } from "@/lib/community";
import { isBlockedBy, isModerator, isSuspended } from "@/lib/moderation";
import { getProfileByUsername } from "@/lib/profiles";
import { normalizeUsername } from "@/lib/username-rules";

export const GET = authed(async ({ user, request }) => {
  const username = normalizeUsername(request.nextUrl.searchParams.get("username") ?? "");
  const profile = await getProfileByUsername(username);
  if (!profile) return fail("That profile wasn't found.", 404);

  const isOwn = profile.userId === user.id;
  const moderator = isModerator(user.id);
  const blocked = isOwn ? false : await isBlockedBy(user.id, profile.userId);
  const posts =
    blocked && !moderator
      ? []
      : await listPosts({ username, viewerId: user.id, moderator, sort: "new" });
  return ok<CommunityProfile>({
    userId: profile.userId,
    username: profile.username,
    isOwn,
    blocked,
    suspended: moderator && (await isSuspended(profile.userId)),
    posts: posts.map(postView),
  });
});
