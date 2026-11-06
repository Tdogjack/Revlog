import { authed, fail, ok, readBody } from "@/lib/api";
import { refreshCommunity } from "@/lib/api-community";
import { fileReport } from "@/lib/community-rules";
import type { ReportKind } from "@/lib/report-reasons";

const KINDS: ReportKind[] = ["post", "comment", "user"];

export const POST = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const kind = KINDS.find((k) => k === body.kind);
  if (!kind) return fail("That's no longer available to report.");
  const error = await fileReport(
    user.id,
    kind,
    String(body.targetId ?? ""),
    String(body.reason ?? ""),
    String(body.details ?? "").trim(),
  );
  if (error) return fail(error);
  // Reports can hide a post, so the feed and the landing page's build refresh.
  refreshCommunity();
  return ok({}, 201);
});
