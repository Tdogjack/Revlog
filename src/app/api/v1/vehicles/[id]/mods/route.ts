import { authed, fail, ok, readBody } from "@/lib/api";
import { logMod, readModFields } from "@/lib/mod-log";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const result = await logMod(user.id, params.id, readModFields((k) => body[k]));
  return "error" in result ? fail(result.error) : ok({ id: result.id }, 201);
});
