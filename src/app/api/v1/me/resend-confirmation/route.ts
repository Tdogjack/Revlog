import { authed, fail, ok } from "@/lib/api";
import { isEmailVerified, sendVerificationEmail } from "@/lib/email-verification";

export const POST = authed(async ({ user }) => {
  if (!user.email) return fail("Your account has no email address.");
  if (await isEmailVerified(user.id)) return ok({ alreadyConfirmed: true });
  const error = await sendVerificationEmail(user.email);
  if (error) return fail(error);
  return ok({ alreadyConfirmed: false });
});
