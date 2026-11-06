import { authed, fail, ok } from "@/lib/api";
import { postView, refreshCommunity } from "@/lib/api-community";
import type { PostDetail } from "@/lib/api-types";
import { deletePost, getPost, listComments, listPostParts } from "@/lib/community";
import { isModerator } from "@/lib/moderation";

type Params = { id: string };

export const GET = authed<Params>(async ({ user, params }) => {
  // Moderators open reported posts that are hidden from everyone else.
  const moderator = isModerator(user.id);
  const post = await getPost(params.id, user.id, moderator);
  if (!post) return fail("That post wasn't found.", 404);
  const [comments, parts] = await Promise.all([
    listComments(post.id, user.id, moderator),
    listPostParts(post),
  ]);
  return ok<PostDetail>({
    post: postView(post),
    comments: comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    parts: parts.map((p) => p.name),
  });
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  await deletePost(user.id, params.id);
  refreshCommunity();
  return ok({});
});
