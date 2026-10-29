"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { localToday } from "@/lib/local-date";
import { MOD_CATEGORIES, MOD_STATUSES } from "@/lib/mod-categories";
import type { ModFormState } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

// Used for both adding and editing; `initial` holds an existing mod's values.
export function ModForm({
  action,
  currentMileage,
  initial,
  submitLabel = "Save mod",
}: {
  action: (prev: ModFormState, formData: FormData) => Promise<ModFormState>;
  currentMileage: number;
  initial?: Record<string, string>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = state?.values ?? initial ?? {};
  const [status, setStatus] = useState(v.status || "installed");
  const dateRef = useRef<HTMLInputElement>(null);

  // New mods default the install date to today, in the user's own time zone.
  useEffect(() => {
    if (!initial && dateRef.current && !dateRef.current.value) {
      dateRef.current.value = localToday();
    }
  }, [initial, state, status]);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-steel">Part</span>
          <input
            name="part"
            required
            placeholder="Cold air intake"
            defaultValue={v.part}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-steel">Brand (optional)</span>
          <input name="brand" placeholder="K&N" defaultValue={v.brand} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-steel">Category</span>
          <select
            name="category"
            required
            defaultValue={v.category ?? "engine"}
            className={inputClass}
          >
            {MOD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-steel">Status</span>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {MOD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status !== "planned" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-steel">Install date (optional)</span>
            <input
              ref={dateRef}
              type="date"
              name="installedOn"
              defaultValue={v.installedOn}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-steel">Mileage at install (optional)</span>
            <input
              name="installedMileage"
              inputMode="numeric"
              placeholder={currentMileage.toLocaleString("en-US")}
              defaultValue={v.installedMileage}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="text-steel">
          {status === "planned" ? "Estimated cost (optional)" : "Cost (optional)"}
        </span>
        <input
          name="cost"
          inputMode="decimal"
          placeholder="$349.99"
          defaultValue={v.cost}
          className={inputClass}
        />
      </label>

      <label className="block text-sm">
        <span className="text-steel">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Part number, where you bought it, install tips…"
          defaultValue={v.notes}
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
