"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { UnsubscribeState } from "./actions";

export function UnsubscribeForm({
  action,
}: {
  action: (prev: UnsubscribeState) => Promise<UnsubscribeState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.done) {
    return (
      <>
        <p className="mt-4 rounded-md bg-done-bg px-3 py-2 text-sm text-done">
          You won&apos;t get reminder emails anymore.
        </p>
        <p className="mt-4 text-sm text-steel">
          Changed your mind? Turn them back on in{" "}
          <Link href="/garage/settings" className="text-chalk hover:text-redline">
            your settings
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <p className="text-sm text-steel">
        Stop getting emails when a service is coming up on your cars. Your garage and reminders stay
        as they are.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-overdue">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg w-full"
      >
        {pending ? "One sec…" : "Unsubscribe from reminder emails"}
      </button>
    </form>
  );
}
