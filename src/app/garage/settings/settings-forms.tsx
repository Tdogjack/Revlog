"use client";

import { useActionState } from "react";
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
}: {
  action: Action;
  testAction: (prev: SettingsState) => Promise<SettingsState>;
  reminderEmails: boolean;
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
              Get an email when a service is due within 500 miles or 14 days, and again weekly while
              it&apos;s overdue.
            </span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-redline px-4 py-2 text-sm font-medium text-white hover:bg-redline-hover disabled:opacity-60"
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
          className="rounded-md border border-graphite px-4 py-2 text-sm hover:border-steel disabled:opacity-60"
        >
          {testPending ? "Sending…" : "Send me a test email"}
        </button>
        <Feedback state={testState} />
      </form>
    </div>
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
      <label className="block text-sm">
        <span className="text-steel">Type DELETE to confirm</span>
        <input
          name="confirm"
          autoComplete="off"
          className="mt-1 w-full max-w-xs rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-overdue"
        />
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-overdue-solid px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
