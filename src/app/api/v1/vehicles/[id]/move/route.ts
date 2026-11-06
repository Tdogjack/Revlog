import { authed, ok, readBody } from "@/lib/api";
import { moveVehicle } from "@/lib/vehicles";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  await moveVehicle(user.id, params.id, body.direction === "up" ? "up" : "down");
  return ok({});
});
