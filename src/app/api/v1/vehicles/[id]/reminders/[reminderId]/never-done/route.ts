import { authed, ok } from "@/lib/api";
import { markReminderNeverDone } from "@/lib/reminder-store";

export const POST = authed<{ id: string; reminderId: string }>(async ({ user, params }) => {
  await markReminderNeverDone(user.id, params.id, params.reminderId);
  return ok({});
});
