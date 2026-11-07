import { authed, fail, ok } from "@/lib/api";
import { sendTestReminder } from "@/lib/email-test";

export const POST = authed(async ({ user }) => {
  const result = await sendTestReminder(user);
  return "error" in result ? fail(result.error) : ok(result);
});
