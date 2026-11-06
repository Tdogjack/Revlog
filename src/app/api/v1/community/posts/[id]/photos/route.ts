import { authed, fail, ok } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { savePostPhoto } from "@/lib/community-rules";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const error = await savePostPhoto(user.id, params.id, await request.formData());
  if (error) return fail(error);
  refreshCommunity();
  return ok({}, 201);
});
