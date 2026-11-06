import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PalettePicker } from "@/components/palette-picker";
import { requireUser } from "@/lib/auth";
import { hasAiConsent } from "@/lib/ai-consent";
import { getEmailSettings } from "@/lib/email-settings";
import { isEmailVerified } from "@/lib/email-verification";
import { countOpenReports, isModerator, listBlockedUsers } from "@/lib/moderation";
import { unblockAccount } from "../../community/actions";
import { deleteAccount, resendConfirmation, saveEmailSettings, sendTestEmail } from "./actions";
import {
  AiScanToggle,
  DeleteAccountForm,
  EmailSettingsForm,
  ResendConfirmationForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Settings · Revlog" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/garage" className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-tight font-semibold">Settings</h1>
      <Suspense fallback={null}>
        <SettingsSections />
      </Suspense>
    </div>
  );
}

async function SettingsSections() {
  const user = await requireUser();
  const moderator = isModerator(user.id);
  const [settings, verified, aiAllowed, blocked, openReports] = await Promise.all([
    getEmailSettings(user.id),
    isEmailVerified(user.id),
    hasAiConsent(user.id),
    listBlockedUsers(user.id),
    moderator ? countOpenReports() : 0,
  ]);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl leading-tight font-semibold">Account</h2>
        <p className="mt-2 text-sm text-steel">{user.email}</p>
        {verified ? (
          <p className="mt-1 text-sm text-done">Email confirmed</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-chalk">
              Email not confirmed. Open the link we sent to add photos and scan receipts.
            </p>
            <ResendConfirmationForm action={resendConfirmation} />
          </>
        )}
        <Link
          href="/reset-password"
          className="btn mt-4"
        >
          Change password
        </Link>
      </section>

      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="mb-4 font-display text-2xl leading-tight font-semibold">Appearance</h2>
        <PalettePicker />
      </section>

      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="mb-4 font-display text-2xl leading-tight font-semibold">Emails</h2>
        <EmailSettingsForm
          action={saveEmailSettings}
          testAction={sendTestEmail}
          reminderEmails={settings.reminderEmails}
          reminderPercent={settings.reminderPercent}
        />
      </section>

      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl leading-tight font-semibold">AI scanning</h2>
        <AiScanToggle allowed={aiAllowed} />
      </section>

      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl leading-tight font-semibold">Blocked accounts</h2>
        {blocked.length === 0 ? (
          <p className="mt-2 text-sm text-steel">
            No one is blocked. Block someone from the menu on their post, comment, or profile to
            hide what they share.
          </p>
        ) : (
          <ul className="mt-3">
            {blocked.map((account) => (
              <li
                key={account.userId}
                className="flex items-center justify-between gap-3 border-t border-rule py-3 text-sm first:border-t-0"
              >
                <Link
                  href={`/u/${account.username}`}
                  className="min-w-0 truncate text-chalk hover:text-redline"
                >
                  @{account.username}
                </Link>
                <form action={unblockAccount.bind(null, account.userId)}>
                  <button type="submit" className="btn">
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {moderator && (
        <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl leading-tight font-semibold">Moderation</h2>
          <p className="mt-2 text-sm text-steel">
            {openReports === 0
              ? "No open reports."
              : `${openReports} open ${openReports === 1 ? "report" : "reports"}.`}
          </p>
          <Link href="/garage/moderation" className="btn mt-4">
            Open moderation
          </Link>
        </section>
      )}

      <section className="rounded-lg border border-overdue/40 bg-panel p-5 sm:p-6">
        <h2 className="mb-3 font-display text-2xl leading-tight font-semibold text-overdue">Delete account</h2>
        <DeleteAccountForm action={deleteAccount} />
      </section>
    </div>
  );
}
