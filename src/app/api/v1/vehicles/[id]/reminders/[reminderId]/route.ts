import { authed, fail, ok, readBody } from "@/lib/api";
import { editReminderFromFields, readReminderFields } from "@/lib/reminder-forms";
import { deleteReminder } from "@/lib/reminder-store";

type Params = { id: string; reminderId: string };

export const PUT = authed<Params>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const error = await editReminderFromFields(
    user.id,
    params.id,
    params.reminderId,
    readReminderFields((k) => body[k]),
  );
  return error ? fail(error) : ok({});
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  await deleteReminder(user.id, params.reminderId);
  return ok({});
});
