import { NextResponse, type NextRequest } from "next/server";
import { readUnsubscribeToken, setReminderEmails } from "@/lib/email-settings";

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// List-Unsubscribe header without opening a page.
export async function POST(request: NextRequest) {
  const userId = readUnsubscribeToken(request.nextUrl.searchParams.get("t") ?? "");
  if (!userId) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await setReminderEmails(userId, false);
  return NextResponse.json({ unsubscribed: true });
}
