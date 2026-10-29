"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { localToday } from "@/lib/local-date";
import { completeReminder, removeReminder, updateMileage } from "./reminders/actions";

const smallInput =
  "w-full rounded-md border border-graphite bg-carbon px-2 py-1 text-sm outline-none focus:border-redline";

// "Mark done" asks when and at what mileage, then logs it to service history.
export function ReminderControls({
  vehicleId,
  reminderId,
  currentMileage,
}: {
  vehicleId: string;
  reminderId: string;
  currentMileage: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof completeReminder>>, fd: FormData) => {
      const result = await completeReminder(vehicleId, reminderId, prev, fd);
      if (result?.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  if (open) {
    return (
      <form action={formAction} className="space-y-2 rounded-lg border border-graphite p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-steel">
            Done on
            <input
              type="date"
              name="doneOn"
              required
              defaultValue={localToday()}
              className={smallInput}
            />
          </label>
          <label className="text-xs text-steel">
            Mileage
            <input
              name="mileage"
              inputMode="numeric"
              defaultValue={currentMileage.toString()}
              className={smallInput}
            />
          </label>
        </div>
        {state?.error && (
          <p role="alert" className="text-xs text-overdue">
            {state.error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-redline px-2.5 py-1 text-xs font-medium text-white hover:bg-redline-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-steel hover:text-chalk"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-steel">Adds this to your service history.</p>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-graphite px-2 py-1 text-xs hover:border-steel"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Mark done
      </button>
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
