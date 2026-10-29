import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { emailConfigured } from "@/lib/email";
import { previewReminderEmails, sendReminderEmails } from "@/lib/reminder-emails";

// Called once a day by Vercel Cron (see vercel.json). Add ?dry=1 to count
// what would be sent without sending anything.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (request.nextUrl.searchParams.get("dry") === "1") {
    return NextResponse.json({ dryRun: await previewReminderEmails() });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ skipped: "Set RESEND_API_KEY and EMAIL_FROM to send email." });
  }
  return NextResponse.json(await sendReminderEmails());
}
