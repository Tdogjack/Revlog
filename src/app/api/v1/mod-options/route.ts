import { authed, ok } from "@/lib/api";
import type { ModOptions } from "@/lib/api-types";
import { MOD_CATEGORIES, MOD_STATUSES } from "@/lib/mod-categories";

// Sent to the app so its lists can't drift from the website's.
export const GET = authed(async () => {
  const options: ModOptions = { categories: [...MOD_CATEGORIES], statuses: [...MOD_STATUSES] };
  return ok(options);
});
