import { authed, fail, ok, readBody } from "@/lib/api";
import { notModerator, refreshCommunity } from "@/lib/api-community";
import { dismissReport, removeReportedContent, suspendReportedUser } from "@/lib/moderation";

const ACTIONS = {
  dismiss: dismissReport,
  remove: removeReportedContent,
  suspend: suspendReportedUser,
};

export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const denied = notModerator(user.id);
  if (denied) return denied;
  const body = await readBody(request);
  const action = body.action;
  if (action !== "dismiss" && action !== "remove" && action !== "suspend") {
    return fail("Pick an action.");
  }
  const error = await ACTIONS[action](params.id);
  if (error) return fail(error);
  refreshCommunity();
  return ok({});
});
