import { authed, fail, ok, readBody } from "@/lib/api";
import { getEmailSettings, saveReminderSettings } from "@/lib/email-settings";

export const GET = authed(async ({ user }) => ok(await getEmailSettings(user.id)));

export const PUT = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const error = await saveReminderSettings(
    user.id,
    body.reminderEmails === true,
    String(body.reminderPercent ?? ""),
  );
  return error ? fail(error) : ok({});
});
