import { authed, fail, ok, readBody } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { orderPostPhotos, savePostPhoto } from "@/lib/community-rules";

// One photo per request, to stay under the upload size limit. Answers with the
// new photo's id, so the app can put it where it belongs.
export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const result = await savePostPhoto(user.id, params.id, await request.formData());
  if ("error" in result) return fail(result.error);
  refreshCommunity();
  return ok({ id: result.id }, 201);
});

// Puts the post's photos in order: { order: [photoId, ...] }.
export const PUT = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const order = Array.isArray(body.order) ? body.order.map(String) : [];
  const error = await orderPostPhotos(user.id, params.id, order);
  if (error) return fail(error);
  refreshCommunity();
  return ok({});
});
