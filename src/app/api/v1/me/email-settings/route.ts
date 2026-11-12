import { authed, fail, ok, readBody } from "@/lib/api";
import { getEmailSettings, saveReminderSettings, setPushReminders } from "@/lib/email-settings";

export const GET = authed(async ({ user }) => ok(await getEmailSettings(user.id)));

export const PUT = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const error = await saveReminderSettings(
    user.id,
    body.reminderEmails === true,
    String(body.reminderPercent ?? ""),
  );
  if (error) return fail(error);
  // Older app versions don't send this, so leave it alone when it's missing.
  if (typeof body.pushReminders === "boolean") await setPushReminders(user.id, body.pushReminders);
  return ok({});
});
