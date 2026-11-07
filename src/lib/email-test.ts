import "server-only";
import { emailConfigured, sendEmail } from "@/lib/email";
import { testEmail } from "@/lib/email-templates";
import { siteUrl } from "@/lib/site";

// Per-instance throttle; enough to stop accidental repeat clicks.
const lastTestSent = new Map<string, number>();

// Sends a sample reminder email to the account's own address.
export async function sendTestReminder(user: {
  id: string;
  email?: string | null;
}): Promise<{ error: string } | { message: string }> {
  if (!user.email) return { error: "Your account has no email address." };
  if (!emailConfigured()) return { error: "Email sending isn't set up on this site yet." };

  const last = lastTestSent.get(user.id) ?? 0;
  if (Date.now() - last < 60_000) return { error: "Wait a minute before sending another." };
  lastTestSent.set(user.id, Date.now());

  const base = siteUrl();
  const result = await sendEmail({
    to: user.email,
    ...testEmail({ garageUrl: `${base}/garage`, settingsUrl: `${base}/garage/settings` }),
  });
  if (!result.ok) return { error: `Couldn't send: ${result.error}` };
  return { message: `Sent to ${user.email}. Check your inbox (and spam folder).` };
}
