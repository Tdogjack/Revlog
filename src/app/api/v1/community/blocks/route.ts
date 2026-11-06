import { authed, fail, ok, readBody } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import type { BlockedUser } from "@/lib/api-types";
import { blockUser, listBlockedUsers } from "@/lib/moderation";

export const GET = authed(async ({ user }) => ok<BlockedUser[]>(await listBlockedUsers(user.id)));

export const POST = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const error = await blockUser(user.id, String(body.userId ?? ""));
  if (error) return fail(error);
  refreshCommunity();
  return ok({}, 201);
});
