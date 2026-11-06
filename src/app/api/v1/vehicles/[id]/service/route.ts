import { authed, fail, ok, readBody } from "@/lib/api";
import { logService, readServiceFields } from "@/lib/service-log";
import { isUuid } from "@/lib/vehicles";

// "reminderId" in the body logs this as "mark done" on that reminder.
export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const reminderId = typeof body.reminderId === "string" ? body.reminderId : null;
  if (reminderId && !isUuid(reminderId)) return fail("That reminder wasn't found.", 404);
  const result = await logService(
    user.id,
    params.id,
    reminderId,
    readServiceFields((k) => body[k]),
  );
  return "error" in result ? fail(result.error) : ok({ id: result.id }, 201);
});
