import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isModerator, listOpenReports, listSuspendedUsers } from "@/lib/moderation";
import { restoreAccount } from "./actions";
import { ReportItem } from "./report-item";

export const metadata: Metadata = { title: "Moderation · Revlog", robots: { index: false } };

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/garage/settings"
        className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk"
      >
        ← Back to settings
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-tight font-semibold">Moderation</h1>
      <p className="mt-2 text-steel">Respond to each report within 24 hours.</p>
      <Suspense fallback={<div className="skeleton mt-6 h-48" aria-busy="true" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const user = await requireUser();
  if (!isModerator(user.id)) notFound();
  const [reports, suspended] = await Promise.all([listOpenReports(), listSuspendedUsers()]);

  return (
    <div className="mt-6 space-y-6">
      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite px-6 py-12 text-center">
          <p className="font-display text-2xl leading-tight font-semibold">No open reports</p>
          <p className="mt-1 text-sm text-steel">
            New reports show up here and are emailed to support.
          </p>
          <Link href="/community" className="btn mt-4">
            Open the community
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <ReportItem key={report.id} report={report} />
          ))}
        </ul>
      )}

      {suspended.length > 0 && (
        <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl leading-tight font-semibold">Suspended accounts</h2>
          <ul className="mt-3">
            {suspended.map((account) => (
              <li
                key={account.userId}
                className="flex items-center justify-between gap-3 border-t border-rule py-3 text-sm first:border-t-0"
              >
                <span className="min-w-0 truncate">@{account.username}</span>
                <form action={restoreAccount.bind(null, account.userId)}>
                  <button type="submit" className="btn">
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
