import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
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
  return NextResponse.json(await sendReminderEmails());
}
