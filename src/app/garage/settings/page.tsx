import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PalettePicker } from "@/components/palette-picker";
import { requireUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/email-settings";
import { isEmailVerified } from "@/lib/email-verification";
import { deleteAccount, resendConfirmation, saveEmailSettings, sendTestEmail } from "./actions";
import { DeleteAccountForm, EmailSettingsForm, ResendConfirmationForm } from "./settings-forms";

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
  const [settings, verified] = await Promise.all([
    getEmailSettings(user.id),
    isEmailVerified(user.id),
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

      <section className="rounded-lg border border-overdue/40 bg-panel p-5 sm:p-6">
        <h2 className="mb-3 font-display text-2xl leading-tight font-semibold text-overdue">Delete account</h2>
        <DeleteAccountForm action={deleteAccount} />
      </section>
    </div>
  );
}
