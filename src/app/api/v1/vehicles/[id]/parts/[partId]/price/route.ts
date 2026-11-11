import { authed, fail, ok } from "@/lib/api";
import type { PriceCheck } from "@/lib/api-types";
import { checkPartPrice, getPart, priceCheckBlocked } from "@/lib/parts";

// Reads the part's price from its link now, instead of waiting for the daily check.
export const POST = authed<{ id: string; partId: string }>(async ({ user, params }) => {
  const part = await getPart(user.id, params.partId);
  if (!part) return fail("That part wasn't found.", 404);
  const blocked = await priceCheckBlocked(user.id, part);
  if (blocked) return fail(blocked, 429);
  return ok<PriceCheck>({ error: await checkPartPrice(part) });
});
