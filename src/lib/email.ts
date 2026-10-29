import "server-only";

// Sends through Resend's HTTP API. RESEND_API_KEY and EMAIL_FROM (like
// "Revlog <reminders@revlog.app>") come from the environment; without them,
// sending is skipped so local dev and previews never email anyone.
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type SendResult = { ok: true } | { ok: false; error: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "Email isn't set up yet." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: body?.message ?? `Resend returned ${response.status}.` };
  } catch {
    return { ok: false, error: "Couldn't reach the email service." };
  }
}
