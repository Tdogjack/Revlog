"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { allowAiScans, stopAiScans } from "../ai-consent-actions";
import type { SettingsState } from "./actions";

type Action = (prev: SettingsState, formData: FormData) => Promise<SettingsState>;

function Feedback({ state }: { state: SettingsState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-overdue">
        {state.error}
      </p>
    );
  }
  if (state?.message) return <p className="text-sm text-done">{state.message}</p>;
  return null;
}

export function EmailSettingsForm({
  action,
  testAction,
  reminderEmails,
  reminderPercent,
}: {
  action: Action;
  testAction: (prev: SettingsState) => Promise<SettingsState>;
  reminderEmails: boolean;
  reminderPercent: number | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [testState, testFormAction, testPending] = useActionState(testAction, undefined);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="reminderEmails"
            defaultChecked={reminderEmails}
            className="mt-0.5 h-4 w-4 accent-redline"
          />
          <span>
            <span className="font-medium">Reminder emails</span>
            <span className="block text-steel">
              Get an email when a service is due soon, and again weekly while it&apos;s overdue.
            </span>
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Due soon at</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              name="reminderPercent"
              inputMode="numeric"
              placeholder="e.g. 80"
              defaultValue={reminderPercent ?? ""}
              className="field w-24"
            />
            <span className="text-steel">% of the miles driven</span>
          </span>
          <span className="field-hint">
            With 80%, a 5,000 mi oil change turns due soon (and emails you) at 4,000 mi. Leave blank
            for the default: 500 mi or 14 days before it&apos;s due.
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <Feedback state={state} />
        </div>
      </form>

      <form action={testFormAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={testPending}
          className="btn"
        >
          {testPending ? "Sending…" : "Send me a test email"}
        </button>
        <Feedback state={testState} />
      </form>
    </div>
  );
}

// Saves as soon as it's flipped. The explanation sits beside the switch, so
// turning it on here is as informed as allowing it from a scan.
export function AiScanToggle({ allowed }: { allowed: boolean }) {
  const [on, setOn] = useOptimistic(allowed);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function flip(next: boolean) {
    if (pending) return;
    setError(null);
    start(async () => {
      setOn(next);
      try {
        await (next ? allowAiScans() : stopAiScans());
      } catch {
        setError("That didn't save. Try again.");
      }
    });
  }

  return (
    <div className="mt-3">
      <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
        <span>
          <span className="font-medium">Read my scans with AI {on ? "(on)" : "(off)"}</span>
          <span className="block text-steel">
            Files you scan are sent to Anthropic, an AI company, to be read. When this is off,
            Revlog asks before sending anything.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          onChange={(e) => flip(e.target.checked)}
          className="switch"
        />
      </label>
      <Link
        href="/privacy#ai-scanning"
        className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-chalk hover:text-redline"
      >
        How scanning works
      </Link>
      {error && (
        <p role="alert" className="text-sm text-overdue">
          {error}
        </p>
      )}
    </div>
  );
}

export function ResendConfirmationForm({
  action,
}: {
  action: (prev: SettingsState) => Promise<SettingsState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Sending…" : "Resend confirmation email"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteAccountForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete your account and everything in it? This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <p className="text-sm text-steel">
        Permanently deletes your account, cars, photos, service history, mods, reminders, and parts.
        This can&apos;t be undone.
      </p>
      <label className="block">
        <span className="field-label">Type DELETE to confirm</span>
        <input
          name="confirm"
          autoComplete="off"
          className="field mt-1 max-w-xs"
        />
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="btn border-transparent bg-overdue-solid text-white hover:border-transparent hover:opacity-90"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
