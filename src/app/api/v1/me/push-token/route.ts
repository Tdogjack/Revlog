import { authed, fail, ok, readBody } from "@/lib/api";
import { registerPushToken, removePushToken } from "@/lib/push";

// The app sends its Expo push token after the user allows notifications,
// and removes it when they log out.
export const PUT = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const error = await registerPushToken(user.id, body.token, body.platform);
  return error ? fail(error) : ok({});
});

export const DELETE = authed(async ({ user, request }) => {
  const body = await readBody(request);
  await removePushToken(user.id, body.token);
  return ok({});
});
