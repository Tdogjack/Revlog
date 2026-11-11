import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";
import { claimAction } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const CONFIRM_EMAIL_FIRST =
  "Confirm your email to add photos and scan receipts. You can resend the link in Settings.";

export async function isEmailVerified(userId: string) {
  const [row] = await db
    .select({ userId: emailVerifications.userId })
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, userId));
  return Boolean(row);
}

export async function markEmailVerified(userId: string) {
  await db.insert(emailVerifications).values({ userId }).onConflictDoNothing();
}

// Sends the "confirm your email" link. It goes out as Supabase's magic link
// email, whose template links to /auth/confirm, which records the
// verification. Returns an error message, or null once it's sent.
export async function sendVerificationEmail(email: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (!error) return null;
  if (error.status === 429) return "A link was just sent. Wait a minute before sending another.";
  return "Couldn't send the email. Try again in a few minutes.";
}

// For the "resend link" button: a daily cap on top of Supabase's own limit.
export async function resendVerificationEmail(userId: string, email: string) {
  if (!(await claimAction(userId, "confirm-email"))) {
    return "You've asked for several links today. Check your inbox and spam, or try tomorrow.";
  }
  return sendVerificationEmail(email);
}
