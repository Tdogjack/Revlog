import { authed, fail, ok, readBody } from "@/lib/api";
import { garageView } from "@/lib/api-views";
import { buildServicePlan, pickAnswers } from "@/lib/service-plan";
import { createVehicle, readVehicleFields, vehicleInput } from "@/lib/vehicles";

export const GET = authed(async ({ user }) => ok(await garageView(user.id)));

export const POST = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const parsed = vehicleInput.safeParse(readVehicleFields((k) => body[k]));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  // Built here rather than sent by the app, so what's saved can't be altered.
  const plan = buildServicePlan(parsed.data, pickAnswers(body));
  const vehicle = await createVehicle(user.id, parsed.data, plan.items);
  return ok({ id: vehicle.id }, 201);
});
