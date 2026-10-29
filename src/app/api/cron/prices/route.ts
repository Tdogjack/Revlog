import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { checkPartPrice, partsDueForCheck } from "@/lib/parts";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer $CRON_SECRET"; anything else is rejected.
export const maxDuration = 60;

const BATCH = 20;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
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
