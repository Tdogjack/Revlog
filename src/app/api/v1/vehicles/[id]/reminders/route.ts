import { authed, fail, ok, readBody } from "@/lib/api";
import { addReminderFromFields, readReminderFields } from "@/lib/reminder-forms";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const error = await addReminderFromFields(
    user.id,
    params.id,
    readReminderFields((k) => body[k]),
  );
  return error ? fail(error) : ok({}, 201);
});
