import { authed, fail, ok } from "@/lib/api";
import { isEmailVerified, resendVerificationEmail } from "@/lib/email-verification";

export const POST = authed(async ({ user }) => {
  if (!user.email) return fail("Your account has no email address.");
  if (await isEmailVerified(user.id)) return ok({ alreadyConfirmed: true });
  const error = await resendVerificationEmail(user.id, user.email);
  if (error) return fail(error);
  return ok({ alreadyConfirmed: false });
});
