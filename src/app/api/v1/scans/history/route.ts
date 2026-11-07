import { authed, fail, ok } from "@/lib/api";
import { scanHistoryFile } from "@/lib/history-scan";
import { scanBlocked } from "@/lib/scan-gate";
import { listServiceTypes } from "@/lib/service-types";

// Reads a photo or PDF into draft records. Nothing is saved here.
export const POST = authed(async ({ user, request }) => {
  const blocked = await scanBlocked(user.id);
  if (blocked) return fail(blocked, 403);
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  const result = await scanHistoryFile(user.id, file, await listServiceTypes(user.id));
  return "error" in result ? fail(result.error) : ok(result.data);
});
