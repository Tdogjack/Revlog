"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormPhotosField,
  uploadQueued,
  type FormPhotos,
  type QueuedPhoto,
} from "@/components/form-photos";
import { PartsFieldset } from "@/components/parts-fieldset";
import type { PartRow } from "@/lib/part-rows";
import { ServiceTypeSelect } from "@/components/service-type-select";
import { localToday } from "@/lib/local-date";
import type { CustomType } from "@/lib/service-categories";
import type { ServiceFormState } from "../actions";

const inputClass = "field mt-1";

// Used for both logging and editing; `initial` holds an existing record's values.
export function ServiceForm({
  action,
  currentMileage,
  customTypes,
  initial = {},
  initialParts = [],
  mileageTypes,
  photos,
  submitLabel = "Save record",
}: {
  action: (prev: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  currentMileage: number;
  customTypes: CustomType[];
  initial?: Record<string, string>;
  initialParts?: PartRow[];
  // When logging, these types need a mileage and fill in the car's current one if blank.
  mileageTypes?: string[];
  photos: FormPhotos;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [queued, setQueued] = useState<QueuedPhoto[]>([]);
  const [state, formAction, pending] = useActionState(
    async (prev: ServiceFormState, fd: FormData) => {
      if (queued.length > 0) fd.set("stay", "1");
      const result = await action(prev, fd);
      if (result?.savedId) {
        const ok = await uploadQueued(photos.vehicleId, "record", result.savedId, queued);
        router.push(
          ok
            ? `/garage/${photos.vehicleId}`
            : `/garage/${photos.vehicleId}/service/${result.savedId}/edit?photos=failed`,
        );
      }
      return result;
    },
    undefined,
  );
  // Stays busy while the new record's photos upload and the page changes.
  const busy = pending || !!state?.savedId;
  const v = state?.values ?? initial;
  const [category, setCategory] = useState(v.category || "oil");
  const needsMileage = mileageTypes?.includes(category) ?? false;
  const dateRef = useRef<HTMLInputElement>(null);

  // Fill in today's date after load, in the user's own time zone.
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = localToday();
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-5 rounded-lg border border-graphite bg-panel p-5 sm:p-6"
    >
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <ServiceTypeSelect
          key={state?.error ?? "initial"}
          label="Type"
          customTypes={customTypes}
          defaultValue={v.category || "oil"}
          defaultNewType={v.newType}
          onChange={setCategory}
          className={inputClass}
        />
        <label className="block">
          <span className="field-label">Date</span>
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

      <label className="block">
        <span className="field-label">Description (optional)</span>
        <input
          name="title"
          placeholder="Full synthetic 0W-20 and filter"
          defaultValue={v.title}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">{needsMileage ? "Mileage" : "Mileage (optional)"}</span>
          <input
            name="mileage"
            inputMode="numeric"
            placeholder={currentMileage.toLocaleString("en-US")}
            defaultValue={v.mileage}
            className={inputClass}
          />
          {needsMileage && (
            <span className="field-hint">
              Leave blank to use the current {currentMileage.toLocaleString("en-US")} mi.
            </span>
          )}
        </label>
        <label className="block">
          <span className="field-label">Cost (optional)</span>
          <input
            name="cost"
            inputMode="decimal"
            placeholder="$89.99"
            defaultValue={v.cost}
            className={inputClass}
          />
          <span className="field-hint">Leave blank to use the parts total.</span>
        </label>
      </div>

      <label className="block">
        <span className="field-label">Shop (optional)</span>
        <input
          name="shop"
          placeholder="Did it myself"
          defaultValue={v.shop}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="field-label">Notes (optional)</span>
        <textarea name="notes" rows={3} defaultValue={v.notes} className={inputClass} />
      </label>

      <PartsFieldset initial={initialParts} label="Parts used (optional)" />

      <FormPhotosField
        photos={photos}
        kind="record"
        label="Photos (optional)"
        hint={`Receipts, invoices, or the work itself. Up to ${photos.max}.`}
        queued={queued}
        onQueue={setQueued}
      />

      {state?.error && (
        <p role="alert" className="text-sm text-overdue">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary btn-lg w-full"
      >
        {busy ? (queued.length > 0 ? "Saving and uploading photos…" : "Saving…") : submitLabel}
      </button>
    </form>
  );
}
