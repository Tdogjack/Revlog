import { authed, fail, ok } from "@/lib/api";
import { sendTestPush } from "@/lib/push";

export const POST = authed(async ({ user }) => {
  const result = await sendTestPush(user.id);
  return "error" in result ? fail(result.error) : ok(result);
});
