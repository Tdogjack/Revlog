import { authed, ok } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { deleteComment } from "@/lib/community";

// The commenter or the post's owner can remove a comment.
export const DELETE = authed<{ id: string }>(async ({ user, params }) => {
  await deleteComment(user.id, params.id);
  refreshCommunity();
  return ok({});
});
