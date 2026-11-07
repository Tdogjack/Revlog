import { authed, fail, ok } from "@/lib/api";
import { scanModReceipt } from "@/lib/mod-scan";
import { scanBlocked } from "@/lib/scan-gate";

// Reads an order email, receipt, or listing into form values. Nothing is saved here.
export const POST = authed(async ({ user, request }) => {
  const blocked = await scanBlocked(user.id);
  if (blocked) return fail(blocked, 403);
  const photo = (await request.formData()).get("photo");
  if (!(photo instanceof File) || photo.size === 0) return fail("Choose a photo to scan.");
  const result = await scanModReceipt(user.id, photo);
  return "error" in result ? fail(result.error) : ok(result.data);
});
