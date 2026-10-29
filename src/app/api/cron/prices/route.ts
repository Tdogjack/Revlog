import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { checkPartPrice, partsDueForCheck } from "@/lib/parts";

// Called once a day by Vercel Cron (see vercel.json).
export const maxDuration = 60;

const BATCH = 20;

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await partsDueForCheck(BATCH);
  let updated = 0;
  let failed = 0;
  // One at a time, so no store gets a burst of requests from us.
  for (const part of due) {
    const error = await checkPartPrice(part);
    if (error) failed++;
    else updated++;
  }
  return NextResponse.json({ checked: due.length, updated, failed });
}
