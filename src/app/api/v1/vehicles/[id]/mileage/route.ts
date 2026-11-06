import { authed, fail, ok, readBody } from "@/lib/api";
import { localDateOrToday, mileageInput, setVehicleMileage } from "@/lib/vehicles";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const parsed = mileageInput.safeParse(body.currentMileage);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await setVehicleMileage(user.id, params.id, parsed.data, localDateOrToday(body.readOn));
  return ok({});
});
