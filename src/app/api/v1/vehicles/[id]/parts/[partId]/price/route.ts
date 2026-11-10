import { authed, fail, ok } from "@/lib/api";
import type { PriceCheck } from "@/lib/api-types";
import { checkPartPrice, getPart } from "@/lib/parts";

// Reads the part's price from its link now, instead of waiting for the daily check.
export const POST = authed<{ id: string; partId: string }>(async ({ user, params }) => {
  const part = await getPart(user.id, params.partId);
  if (!part) return fail("That part wasn't found.", 404);
  // Stores don't like being hammered; once a minute per part is plenty.
  if (part.lastCheckedAt && Date.now() - part.lastCheckedAt.getTime() < 60_000) {
    return fail("Just checked. Try again in a minute.", 429);
  }
  return ok<PriceCheck>({ error: await checkPartPrice(part) });
});
