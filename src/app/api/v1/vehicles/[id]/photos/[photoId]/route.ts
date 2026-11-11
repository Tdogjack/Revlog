import { authed, fail, ok } from "@/lib/api";
import { deletePhoto, replacePhotoFile } from "@/lib/gallery";

// Swaps the photo for an edited (cropped or rotated) copy sent as "photo".
export const PUT = authed<{ id: string; photoId: string }>(async ({ user, request, params }) => {
  const error = await replacePhotoFile(user.id, params.photoId, await request.formData());
  return error ? fail(error) : ok({});
});

export const DELETE = authed<{ id: string; photoId: string }>(async ({ user, params }) => {
  await deletePhoto(user.id, params.photoId);
  return ok({});
});
