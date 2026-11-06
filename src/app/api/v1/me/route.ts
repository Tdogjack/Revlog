import { removeAccount } from "@/lib/account";
import { hasAiConsent } from "@/lib/ai-consent";
import { authed, fail, ok, readBody } from "@/lib/api";
import type { Me } from "@/lib/api-types";
import { isEmailVerified } from "@/lib/email-verification";
import { getProfile } from "@/lib/profiles";

export const GET = authed(async ({ user }) => {
  const [profile, emailVerified, aiConsent] = await Promise.all([
    getProfile(user.id),
    isEmailVerified(user.id),
    hasAiConsent(user.id),
  ]);
  return ok<Me>({
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
    emailVerified,
    aiConsent,
  });
});

// Both stores require account deletion inside the app.
export const DELETE = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const error = await removeAccount(user.id, String(body.confirm ?? ""));
  if (error) return fail(error);
  return ok({});
});
