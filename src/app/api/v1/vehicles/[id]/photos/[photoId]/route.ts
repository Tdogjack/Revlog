import { authed, ok } from "@/lib/api";
import { deletePhoto } from "@/lib/gallery";

export const DELETE = authed<{ id: string; photoId: string }>(async ({ user, params }) => {
  await deletePhoto(user.id, params.photoId);
  return ok({});
});
