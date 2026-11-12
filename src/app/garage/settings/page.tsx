import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
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
      <h1 className="font-display text-4xl font-semibold">Settings</h1>
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
    <div className="mt-8 space-y-8">
      <Group title="Account">
        <p className="text-sm text-steel">{user.email}</p>
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/reset-password" className="btn">
            Change password
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn">
              Log out
            </button>
          </form>
        </div>
      </Group>

      <Group title="Appearance">
        <PalettePicker />
      </Group>

      <Group title="Emails">
        <EmailSettingsForm
          action={saveEmailSettings}
          testAction={sendTestEmail}
          reminderEmails={settings.reminderEmails}
          reminderPercent={settings.reminderPercent}
        />
      </Group>

      <Group title="AI scanning">
        <AiScanToggle allowed={aiAllowed} />
      </Group>

      <Group title="Blocked accounts">
        {blocked.length === 0 ? (
          <p className="text-sm text-steel">
            No one is blocked. Block someone from the menu on their post, comment, or profile to
            hide what they share.
          </p>
        ) : (
          <ul className="-my-3">
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
      </Group>

      {moderator && (
        <Group title="Moderation">
          <p className="text-sm text-steel">
            {openReports === 0
              ? "No open reports."
              : `${openReports} open ${openReports === 1 ? "report" : "reports"}.`}
          </p>
          <Link href="/garage/moderation" className="btn mt-4">
            Open moderation
          </Link>
        </Group>
      )}

      <Group title="Delete account" tone="danger">
        <DeleteAccountForm action={deleteAccount} />
      </Group>
    </div>
  );
}

// One settings group: a name above, its controls on a panel below, like a
// grouped list on a phone.
function Group({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`group-${title}`}>
      <h2
        id={`group-${title}`}
        className={`mb-2 px-1 text-base font-semibold ${tone === "danger" ? "text-overdue" : "text-chalk"}`}
      >
        {title}
      </h2>
      <div
        className={`rounded-2xl border bg-panel p-5 sm:p-6 ${tone === "danger" ? "border-overdue/40" : "border-graphite"}`}
      >
        {children}
      </div>
    </section>
  );
}
