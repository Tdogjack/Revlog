import { authed, fail, ok } from "@/lib/api";
import { readHistorySheet } from "@/lib/sheet-import";
import { listServiceTypes } from "@/lib/service-types";

// Reads a spreadsheet into draft records. Nothing is saved here.
export const POST = authed(async ({ user, request }) => {
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  const result = await readHistorySheet(user.id, file, await listServiceTypes(user.id));
  return "error" in result ? fail(result.error) : ok(result.data);
});
