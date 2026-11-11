import "server-only";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateEvents } from "@/db/schema";

// Per-user caps, stored in the database so they hold across server instances.
// Every limit in the app is listed in docs/limits.md; update it when these change.
export const LIMITS = {
  "photo-upload": { max: 50, hours: 24 },
  "price-check": { max: 30, hours: 1 },
  "test-email": { max: 5, hours: 24 },
  "confirm-email": { max: 5, hours: 24 },
} as const;

export type LimitedAction = keyof typeof LIMITS;

// Counts the user's recent uses of an action and records this one. Returns
// false once the cap is reached. Attempts that later fail still count.
export async function claimAction(userId: string, action: LimitedAction) {
  const { max, hours } = LIMITS[action];
  const since = sql`now() - make_interval(hours => ${hours})`;
  const mine = and(eq(rateEvents.userId, userId), eq(rateEvents.action, action));

  const [{ used }] = await db
    .select({ used: count() })
    .from(rateEvents)
    .where(and(mine, gt(rateEvents.createdAt, since)));
  if (used >= max) return false;

  await db.insert(rateEvents).values({ userId, action });
  await db.delete(rateEvents).where(and(mine, lt(rateEvents.createdAt, since)));
  return true;
}
