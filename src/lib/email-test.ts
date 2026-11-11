import "server-only";
import { emailConfigured, sendEmail } from "@/lib/email";
import { testEmail } from "@/lib/email-templates";
import { claimAction } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

// Sends a sample reminder email to the account's own address.
export async function sendTestReminder(user: {
  id: string;
  email?: string | null;
}): Promise<{ error: string } | { message: string }> {
  if (!user.email) return { error: "Your account has no email address." };
  if (!emailConfigured()) return { error: "Email sending isn't set up on this site yet." };

  if (!(await claimAction(user.id, "test-email"))) {
    return { error: "You've sent several test emails today. Try again tomorrow." };
  }

  const base = siteUrl();
  const result = await sendEmail({
    to: user.email,
    ...testEmail({ garageUrl: `${base}/garage`, settingsUrl: `${base}/garage/settings` }),
  });
  if (!result.ok) return { error: `Couldn't send: ${result.error}` };
  return { message: `Sent to ${user.email}. Check your inbox (and spam folder).` };
}
