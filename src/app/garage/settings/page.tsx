import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/email-settings";
import { deleteAccount, saveEmailSettings, sendTestEmail } from "./actions";
import { DeleteAccountForm, EmailSettingsForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings · Revlog" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/garage" className="text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Settings</h1>
      <Suspense fallback={null}>
        <SettingsSections />
      </Suspense>
    </div>
  );
}

async function SettingsSections() {
  const user = await requireUser();
  const settings = await getEmailSettings(user.id);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-graphite bg-panel p-6">
        <h2 className="font-medium">Account</h2>
        <p className="mt-2 text-sm text-steel">{user.email}</p>
        <Link
          href="/reset-password"
          className="mt-4 inline-block rounded-md border border-graphite px-4 py-2 text-sm hover:border-steel"
        >
          Change password
        </Link>
      </section>

      <section className="rounded-xl border border-graphite bg-panel p-6">
        <h2 className="mb-4 font-medium">Emails</h2>
        <EmailSettingsForm
          action={saveEmailSettings}
          testAction={sendTestEmail}
          reminderEmails={settings.reminderEmails}
        />
      </section>

      <section className="rounded-xl border border-overdue/40 bg-panel p-6">
        <h2 className="mb-3 font-medium text-overdue">Delete account</h2>
        <DeleteAccountForm action={deleteAccount} />
      </section>
    </div>
  );
}
