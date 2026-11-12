import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { isModerator, type OpenReport } from "@/lib/moderation";
import { reportReasonLabel } from "@/lib/report-reasons";
import { dismiss, removeReported, suspendReported } from "./actions";
import { ConfirmButton } from "./confirm-button";

// Comments link straight to the comment, not just to the thread.
function reportHref(report: OpenReport) {
  return report.targetType === "comment"
    ? report.targetPath.replace("#comments", `#comment-${report.targetId}`)
    : report.targetPath;
}

// The whole card opens the reported content: the title's link stretches over
// it, and the buttons sit above that link.
export function ReportItem({ report }: { report: OpenReport }) {
  const noun = report.targetType === "user" ? "account" : report.targetType;
  const reason = reportReasonLabel(report.reason);
  const target = `@${report.reportedUsername}'s ${noun}`;
  return (
    <li
      className={`relative rounded-2xl border border-graphite bg-panel p-5 sm:p-6 ${report.gone ? "" : "hover:border-steel"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">
          {report.gone ? (
            reason
          ) : (
            <Link
              href={reportHref(report)}
              aria-label={`Open ${target}, reported for ${reason.toLowerCase()}`}
              className="after:absolute after:inset-0 after:rounded-lg hover:text-redline"
            >
              {reason}
            </Link>
          )}
        </h2>
        {!report.gone && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-steel" aria-hidden />}
      </div>
      <p className="mt-1 text-sm text-steel">
        <span className="font-semibold text-chalk">{target}</span>, reported by{" "}
        {report.reporter ? `@${report.reporter}` : "a deleted account"} on{" "}
        {report.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        {report.gone && ". Already deleted."}
      </p>
      {report.contentSnapshot && (
        <p className="mt-3 max-w-prose rounded-md bg-carbon p-3 text-sm whitespace-pre-line">
          {report.contentSnapshot}
        </p>
      )}
      {report.details && (
        <p className="mt-3 max-w-prose text-sm whitespace-pre-line text-steel">
          Reporter&apos;s note: {report.details}
        </p>
      )}
      <div className="relative z-10 mt-4 flex flex-wrap gap-3">
        <form action={dismiss.bind(null, report.id)}>
          <button type="submit" className="btn">
            {report.gone ? "Close report" : "Dismiss"}
          </button>
        </form>
        {report.targetType !== "user" && !report.gone && (
          <ConfirmButton
            label={`Remove ${noun}`}
            title={`Remove ${target}?`}
            body={`This permanently deletes the ${noun} and closes its reports.`}
            action={removeReported.bind(null, report.id)}
          />
        )}
        {report.reportedUserId && !isModerator(report.reportedUserId) && (
          <ConfirmButton
            label={`Suspend @${report.reportedUsername}`}
            title={`Suspend @${report.reportedUsername}?`}
            body="This hides all of their posts and comments and stops them posting. Their private garage stays. You can restore them from this page."
            action={suspendReported.bind(null, report.id)}
          />
        )}
      </div>
    </li>
  );
}
