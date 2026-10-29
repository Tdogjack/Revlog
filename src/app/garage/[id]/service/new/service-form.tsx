"use client";

import { useActionState, useEffect, useRef } from "react";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";
import { addServiceRecord } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ServiceForm({ vehicleId, currentMileage }: { vehicleId: string; currentMileage: number }) {
  const [state, formAction, pending] = useActionState(
    addServiceRecord.bind(null, vehicleId),
    undefined,
  );
  const v = state?.values ?? {};
  const dateRef = useRef<HTMLInputElement>(null);

  // Fill in today's date after load, in the user's own time zone.
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = today();
  }, [state]);

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-steel">Type</span>
          <select name="category" required defaultValue={v.category ?? "oil"} className={inputClass}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-steel">Date</span>
          <input ref={dateRef} type="date" name="servicedOn" required defaultValue={v.servicedOn} className={inputClass} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-steel">Description (optional)</span>
        <input
          name="title"
          placeholder="Full synthetic 0W-20 and filter"
          defaultValue={v.title}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-steel">Mileage (optional)</span>
          <input
            name="mileage"
            inputMode="numeric"
            placeholder={currentMileage.toLocaleString("en-US")}
            defaultValue={v.mileage}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-steel">Cost (optional)</span>
          <input name="cost" inputMode="decimal" placeholder="$89.99" defaultValue={v.cost} className={inputClass} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-steel">Shop (optional)</span>
        <input name="shop" placeholder="Did it myself" defaultValue={v.shop} className={inputClass} />
      </label>

      <label className="block text-sm">
        <span className="text-steel">Notes (optional)</span>
        <textarea name="notes" rows={3} defaultValue={v.notes} className={inputClass} />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-due">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-redline py-2.5 font-medium text-white hover:bg-redline-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}
