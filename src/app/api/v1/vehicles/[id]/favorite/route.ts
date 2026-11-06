import { authed, ok, readBody } from "@/lib/api";
import { setVehicleFavorite } from "@/lib/vehicles";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  await setVehicleFavorite(user.id, params.id, body.favorite === true);
  return ok({});
});
