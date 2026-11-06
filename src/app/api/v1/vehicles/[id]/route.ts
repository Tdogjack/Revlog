import { revalidatePath, revalidateTag } from "next/cache";
import { authed, fail, ok, readBody } from "@/lib/api";
import { carView } from "@/lib/api-views";
import { FEATURED_BUILD_TAG } from "@/lib/community";
import { deleteVehicle } from "@/lib/vehicle-removal";
import {
  getVehicle,
  readVehicleFields,
  removalConfirmed,
  updateVehicle,
  vehicleInput,
} from "@/lib/vehicles";

type Params = { id: string };

export const GET = authed<Params>(async ({ user, params }) => {
  const car = await carView(user.id, params.id);
  return car ? ok(car) : fail("That car wasn't found.", 404);
});

export const PUT = authed<Params>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const parsed = vehicleInput.safeParse(readVehicleFields((k) => body[k]));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const found = await updateVehicle(user.id, params.id, parsed.data);
  return found ? ok({}) : fail("That car wasn't found.", 404);
});

export const DELETE = authed<Params>(async ({ user, request, params }) => {
  const car = await getVehicle(user.id, params.id);
  if (!car) return fail("That car wasn't found.", 404);
  const body = await readBody(request);
  if (!removalConfirmed(car, String(body.confirm ?? ""))) {
    return fail("Type the car's name or DELETE to confirm.");
  }
  await deleteVehicle(user.id, params.id);
  revalidateTag(FEATURED_BUILD_TAG, "max");
  revalidatePath("/community");
  return ok({});
});
