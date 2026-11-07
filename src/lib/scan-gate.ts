import "server-only";
import { AI_CONSENT_NEEDED, hasAiConsent } from "@/lib/ai-consent";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";

// What stops this account from sending a file to the AI service, on the
// website and in the phone app. Null means it can.
export async function scanBlocked(userId: string) {
  if (!(await isEmailVerified(userId))) return CONFIRM_EMAIL_FIRST;
  if (!(await hasAiConsent(userId))) return AI_CONSENT_NEEDED;
  return null;
}
