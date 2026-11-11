import { authed, ok, readBody } from "@/lib/api";
import { setVehicleOrder } from "@/lib/vehicles";

// Puts the cars in the order they were dragged into: { order: [carId, ...] }.
// Favorites stay above the rest.
export const PUT = authed(async ({ user, request }) => {
  const body = await readBody(request);
  await setVehicleOrder(user.id, Array.isArray(body.order) ? body.order.map(String) : []);
  return ok({});
});
