import { authed, fail, ok, readBody } from "@/lib/api";
import { postingFailure, postView, refreshCommunity } from "@/lib/api-community";
import type { PostDetail } from "@/lib/api-types";
import { deletePost, getPost, listComments, listPostParts } from "@/lib/community";
import { editPost } from "@/lib/community-rules";
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

// Edits the post: { title, body, tag, showParts, keepPhotoIds, photoIds }.
// keepPhotoIds are photos already on it, in order; photoIds are garage photos
// to add. Answers with which post photo each garage photo became, so new
// uploads can then be added and everything put in order.
export const PATCH = authed<Params>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const ids = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
  const result = await editPost(user.id, params.id, {
    title: String(body.title ?? "").trim(),
    body: String(body.body ?? "").trim(),
    tag: String(body.tag ?? ""),
    showParts: body.showParts === true,
    keepPhotoIds: ids(body.keepPhotoIds),
    photoIds: ids(body.photoIds),
  });
  if (!("id" in result)) return postingFailure(result);
  refreshCommunity();
  return ok({ id: result.id, added: result.added });
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  await deletePost(user.id, params.id);
  refreshCommunity();
  return ok({});
});
