"use client";

import Link from "next/link";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { removeReminder, updateMileage } from "./reminders/actions";

// "Mark done" opens Log service with this reminder's type filled in.
export function ReminderControls({
  vehicleId,
  reminderId,
}: {
  vehicleId: string;
  reminderId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/garage/${vehicleId}/reminders/${reminderId}/edit`}
        aria-label="Edit reminder"
        className="text-steel hover:text-chalk"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
      <form
        action={removeReminder.bind(null, vehicleId, reminderId)}
        onSubmit={(e) => {
          if (!confirm("Delete this reminder?")) e.preventDefault();
        }}
      >
        <button
          type="submit"
          aria-label="Delete reminder"
          className="text-steel hover:text-overdue"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </form>
      <Link
        href={`/garage/${vehicleId}/service/new?reminder=${reminderId}`}
        className="flex items-center gap-1 rounded-md border border-graphite px-2 py-1 text-xs hover:border-steel"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Mark done
      </Link>
    </div>
  );
}

// Click the odometer to correct it; reminders are measured against this number.
export function MileageEditor({
  vehicleId,
  currentMileage,
}: {
  vehicleId: string;
  currentMileage: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateMileage>>, fd: FormData) => {
      const result = await updateMileage(vehicleId, prev, fd);
      if (!result?.error) setEditing(false);
      return result;
    },
    undefined,
  );

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 font-mono text-sm text-steel hover:text-chalk"
        title="Update mileage"
      >
        {currentMileage.toLocaleString("en-US")} mi
        <Pencil className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          name="currentMileage"
          inputMode="numeric"
          autoFocus
          defaultValue={currentMileage.toString()}
          aria-label="Current mileage"
          className="w-28 rounded-md border border-graphite bg-carbon px-2 py-1 text-right font-mono text-sm outline-none focus:border-redline"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-redline px-2.5 py-1 text-xs font-medium text-white hover:bg-redline-hover disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-steel hover:text-chalk"
        >
          Cancel
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}
    </form>
  );
}
