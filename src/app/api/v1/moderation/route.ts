import { authed, ok } from "@/lib/api";
import { notModerator } from "@/lib/api-community";
import type { ModerationQueue } from "@/lib/api-types";
import { listOpenReports, listSuspendedUsers } from "@/lib/moderation";
import { reportReasonLabel } from "@/lib/report-reasons";

export const GET = authed(async ({ user }) => {
  const denied = notModerator(user.id);
  if (denied) return denied;
  const [reports, suspended] = await Promise.all([listOpenReports(), listSuspendedUsers()]);
  return ok<ModerationQueue>({
    reports: reports.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      targetType: r.targetType,
      targetId: r.targetId,
      reportedUserId: r.reportedUserId,
      reportedUsername: r.reportedUsername,
      contentSnapshot: r.contentSnapshot,
      reason: reportReasonLabel(r.reason),
      details: r.details,
      reporter: r.reporter,
      gone: r.gone,
    })),
    suspended,
  });
});
