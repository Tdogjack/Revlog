"use client";

import { useActionState, useEffect, useRef } from "react";
import { ServiceTypeSelect } from "@/components/service-type-select";
import { localToday } from "@/lib/local-date";
import type { CustomType } from "@/lib/service-categories";
import { addServiceRecord } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

export function ServiceForm({
  vehicleId,
  currentMileage,
  customTypes,
}: {
  vehicleId: string;
  currentMileage: number;
  customTypes: CustomType[];
}) {
  const [state, formAction, pending] = useActionState(
    addServiceRecord.bind(null, vehicleId),
    undefined,
  );
  const v = state?.values ?? {};
  const dateRef = useRef<HTMLInputElement>(null);

  // Fill in today's date after load, in the user's own time zone.
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = localToday();
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6"
    >
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <ServiceTypeSelect
          key={state?.error ?? "initial"}
          label="Type"
          customTypes={customTypes}
          defaultValue={v.category || "oil"}
          defaultNewType={v.newType}
          className={inputClass}
        />
        <label className="block text-sm">
          <span className="text-steel">Date</span>
          <input
            ref={dateRef}
            type="date"
            name="servicedOn"
            required
            defaultValue={v.servicedOn}
            className={inputClass}
          />
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
          <input
            name="cost"
            inputMode="decimal"
            placeholder="$89.99"
            defaultValue={v.cost}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-steel">Shop (optional)</span>
        <input
          name="shop"
          placeholder="Did it myself"
          defaultValue={v.shop}
          className={inputClass}
        />
      </label>

      <label className="block text-sm">
        <span className="text-steel">Notes (optional)</span>
        <textarea name="notes" rows={3} defaultValue={v.notes} className={inputClass} />
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
        {pending ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}
