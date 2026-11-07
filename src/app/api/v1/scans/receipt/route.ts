import { authed, fail, ok } from "@/lib/api";
import { scanReceipt } from "@/lib/receipt-scan";
import { scanBlocked } from "@/lib/scan-gate";
import { listServiceTypes } from "@/lib/service-types";

// Reads a receipt photo into form values. Nothing is saved here.
export const POST = authed(async ({ user, request }) => {
  const blocked = await scanBlocked(user.id);
  if (blocked) return fail(blocked, 403);
  const photo = (await request.formData()).get("photo");
  if (!(photo instanceof File) || photo.size === 0) return fail("Choose a receipt photo.");
  const result = await scanReceipt(user.id, photo, await listServiceTypes(user.id));
  return "error" in result ? fail(result.error) : ok(result.data);
});
