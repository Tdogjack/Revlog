"use client";

import { useActionState, useState } from "react";
import { ServiceTypeSelect } from "@/components/service-type-select";
import { localToday } from "@/lib/local-date";
import { REMINDER_PRESETS } from "@/lib/reminder-presets";
import type { CustomType } from "@/lib/service-categories";
import type { ReminderFormState } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

// Picking a type with a known interval fills it in; other types keep what's typed.
function presetIntervals(type: string) {
  const p = REMINDER_PRESETS.find((p) => p.type === type);
  return p
    ? {
        intervalMiles: p.intervalMiles?.toString() ?? "",
        intervalMonths: p.intervalMonths?.toString() ?? "",
      }
    : null;
}

// Used for both adding and editing. When editing, `initial` holds the
// reminder's values and the last-done fields are hidden.
export function ReminderForm({
  action,
  customTypes,
  initial,
  submitLabel = "Save reminder",
}: {
  action: (prev: ReminderFormState, formData: FormData) => Promise<ReminderFormState>;
  customTypes: CustomType[];
  initial?: Record<string, string>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isEdit = !!initial;
  const v = state?.values ?? initial;
  const [type, setType] = useState(v?.category || "oil");
  const [intervals, setIntervals] = useState(
    () =>
      (v && { intervalMiles: v.intervalMiles, intervalMonths: v.intervalMonths }) ??
      presetIntervals("oil")!,
  );

  return (
    <form
      action={(fd) => {
        fd.set("today", localToday());
        return formAction(fd);
      }}
      className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6"
    >
      <ServiceTypeSelect
        key={state?.error ?? "initial"}
        label="Service"
        customTypes={customTypes}
        value={type}
        defaultNewType={v?.newType}
        onChange={(next) => {
          setType(next);
          const preset = presetIntervals(next);
          if (preset) setIntervals(preset);
        }}
        className={inputClass}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-steel">Every … miles</span>
          <input
            name="intervalMiles"
            inputMode="numeric"
            placeholder="5,000"
            value={intervals.intervalMiles}
            onChange={(e) => setIntervals((i) => ({ ...i, intervalMiles: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-steel">Or every … months</span>
          <input
            name="intervalMonths"
            inputMode="numeric"
            placeholder="6"
            value={intervals.intervalMonths}
            onChange={(e) => setIntervals((i) => ({ ...i, intervalMonths: e.target.value }))}
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-steel">
        Whichever comes first. Common intervals fill in automatically; check your owner&apos;s
        manual and adjust if needed.
      </p>

      {isEdit ? (
        <p className="text-xs text-steel">
          Last done comes from your service history. To change it, edit or log the service.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-steel">Last done (optional)</span>
              <input
                type="date"
                name="lastDoneOn"
                defaultValue={v?.lastDoneOn}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="text-steel">Mileage then (optional)</span>
              <input
                name="lastDoneMileage"
                inputMode="numeric"
                placeholder="0"
                defaultValue={v?.lastDoneMileage}
                className={inputClass}
              />
            </label>
          </div>
          <p className="-mt-2 text-xs text-steel">
            If you fill these in, the service is added to your history. Leave them blank if
            you&apos;ve already logged it (the reminder uses your latest record) or if it&apos;s
            never been done (it counts from 0 mi).
          </p>
        </>
      )}

      <label className="block text-sm">
        <span className="text-steel">Name (optional)</span>
        <input
          name="task"
          placeholder="Uses the service name"
          defaultValue={v?.task}
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-overdue">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-redline py-2.5 font-medium text-white hover:bg-redline-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
