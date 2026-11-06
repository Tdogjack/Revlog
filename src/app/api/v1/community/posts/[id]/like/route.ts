import { authed, fail, ok, readBody } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { likePost } from "@/lib/community-rules";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const result = await likePost(user.id, params.id, body.liked === true);
  if (!result) return fail("You can't like this post.", 403);
  refreshCommunity();
  return ok(result);
});
