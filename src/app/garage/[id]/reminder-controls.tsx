"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { localToday } from "@/lib/local-date";
import { removeReminder, updateMileage } from "./reminders/actions";

// Edit and delete, shown once a reminder is opened.
export function ReminderControls({
  vehicleId,
  reminderId,
}: {
  vehicleId: string;
  reminderId: string;
}) {
  return (
    <div className="mt-2 -ml-2 flex items-center">
      <Link
        href={`/garage/${vehicleId}/reminders/${reminderId}/edit`}
        aria-label="Edit reminder"
        title="Edit reminder"
        className="icon-btn"
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
          title="Delete reminder"
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </form>
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
        className="group -mx-2 flex items-baseline gap-2 rounded-md px-2 py-1 text-left hover:bg-panel"
        title="Update mileage"
        aria-label={`Odometer ${currentMileage.toLocaleString("en-US")} miles, update mileage`}
      >
        <span className="readout text-5xl leading-none">
          {currentMileage.toLocaleString("en-US")}
        </span>
        <span className="text-sm text-steel">mi</span>
        <Pencil
          className="h-4 w-4 self-center text-steel opacity-60 group-hover:opacity-100"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="readOn" value={localToday()} />
      <div className="flex items-center gap-2">
        <input
          name="currentMileage"
          inputMode="numeric"
          autoFocus
          defaultValue={currentMileage.toString()}
          aria-label="Current mileage"
          className="field readout w-36 text-2xl"
        />
        <button type="submit" disabled={pending} className="btn btn-primary">
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn border-transparent text-steel hover:text-chalk"
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
