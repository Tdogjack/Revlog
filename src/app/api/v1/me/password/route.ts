import { changePassword } from "@/lib/account";
import { authed, fail, ok, readBody } from "@/lib/api";
import { bearerToken } from "@/lib/supabase/server";

// Sets a new password for the signed-in account, like the website's reset page.
export const POST = authed(async ({ request }) => {
  const token = await bearerToken();
  if (!token) return fail("Your session ended. Sign in again.", 401);
  const body = await readBody(request);
  const error = await changePassword(
    token,
    String(body.password ?? ""),
    String(body.confirm ?? ""),
  );
  return error ? fail(error) : ok({});
});
