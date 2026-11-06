import { authed, ok } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { unblockUser } from "@/lib/moderation";

export const DELETE = authed<{ id: string }>(async ({ user, params }) => {
  await unblockUser(user.id, params.id);
  refreshCommunity();
  return ok({});
});
