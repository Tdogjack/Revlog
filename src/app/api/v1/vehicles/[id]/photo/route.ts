import { authed, fail, ok } from "@/lib/api";
import { clearVehiclePhoto, replaceVehiclePhoto } from "@/lib/gallery";

type Params = { id: string };

export const POST = authed<Params>(async ({ user, request, params }) => {
  const error = await replaceVehiclePhoto(user.id, params.id, await request.formData());
  return error ? fail(error) : ok({});
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  await clearVehiclePhoto(user.id, params.id);
  return ok({});
});
