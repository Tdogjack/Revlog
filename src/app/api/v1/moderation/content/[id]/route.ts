import { authed, fail, ok, readBody } from "@/lib/api";
import { notModerator, refreshCommunity } from "@/lib/api-community";
import { removeContent } from "@/lib/moderation";

export const DELETE = authed<{ id: string }>(async ({ user, request, params }) => {
  const denied = notModerator(user.id);
  if (denied) return denied;
  const body = await readBody(request);
  if (body.kind !== "post" && body.kind !== "comment") return fail("Pick what to remove.");
  await removeContent(body.kind, params.id);
  refreshCommunity();
  return ok({});
});
