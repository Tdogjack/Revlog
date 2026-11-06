import { grantAiConsent, withdrawAiConsent } from "@/lib/ai-consent";
import { authed, ok } from "@/lib/api";

export const POST = authed(async ({ user }) => {
  await grantAiConsent(user.id);
  return ok({ aiConsent: true });
});

export const DELETE = authed(async ({ user }) => {
  await withdrawAiConsent(user.id);
  return ok({ aiConsent: false });
});
