import { authed, ok, readBody } from "@/lib/api";
import { saveHistoryRows } from "@/lib/history-save";

// Saves reviewed rows, all or none. A row's error comes back with its key, so
// the app can point at the row to fix.
export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const result = await saveHistoryRows(user.id, params.id, String(body.rows ?? ""));
  return ok(result, "saved" in result ? 201 : 400);
});
