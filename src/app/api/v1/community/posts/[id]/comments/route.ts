import { authed, ok, readBody } from "@/lib/api";
import { postingFailure, refreshCommunity } from "@/lib/api-community";
import { publishComment } from "@/lib/community-rules";

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const problem = await publishComment(user.id, params.id, String(body.body ?? "").trim());
  if (problem) return postingFailure(problem);
  refreshCommunity();
  return ok({}, 201);
});
