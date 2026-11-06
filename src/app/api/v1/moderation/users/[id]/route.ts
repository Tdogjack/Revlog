import { authed, fail, ok, readBody } from "@/lib/api";
import { notModerator, refreshCommunity } from "@/lib/api-community";
import { restoreUser, suspendUser } from "@/lib/moderation";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const denied = notModerator(user.id);
  if (denied) return denied;
  const body = await readBody(request);
  if (body.action === "restore") {
    await restoreUser(params.id);
  } else if (body.action === "suspend") {
    const error = await suspendUser(params.id);
    if (error) return fail(error);
  } else {
    return fail("Pick an action.");
  }
  refreshCommunity();
  return ok({});
});
