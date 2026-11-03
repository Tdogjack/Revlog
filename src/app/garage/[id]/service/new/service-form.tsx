"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormPhotosField,
  queuePhoto,
  uploadQueued,
  type FormPhotos,
  type QueuedPhoto,
} from "@/components/form-photos";
import { PartsFieldset } from "@/components/parts-fieldset";
import type { PartRow } from "@/lib/part-rows";
import { ServiceTypeSelect } from "@/components/service-type-select";
import { localToday } from "@/lib/local-date";
import type { ExtraService, ScannedReceipt } from "@/lib/receipt-scan";
import { categoryLabel, type CustomType } from "@/lib/service-categories";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { scanServiceReceipt, type ServiceFormState } from "../actions";

const inputClass = "field mt-1";

let nextExtraKey = 0;

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
  // A scanned receipt replaces the starting values; the fields remount to show them.
  const [scanned, setScanned] = useState<{ values: Record<string, string>; parts: PartRow[] }>();
  const [scanCount, setScanCount] = useState(0);
  const [extras, setExtras] = useState<(ExtraService & { key: number; keep: boolean })[]>([]);
  const v = state?.values ?? scanned?.values ?? initial;
  const [category, setCategory] = useState(v.category || "oil");
  const needsMileage = mileageTypes?.includes(category) ?? false;
  const dateRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fill in today's date after load, in the user's own time zone.
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = localToday();
  }, [state, scanCount]);

  // Keeps what the user already typed wherever the receipt had nothing,
  // and adds the receipt's parts after any already listed.
  function applyScan(receipt: ScannedReceipt, photo: File) {
    const fd = new FormData(formRef.current!);
    const values: Record<string, string> = {};
    for (const [key, value] of fd) if (typeof value === "string") values[key] = value;
    for (const [key, value] of Object.entries(receipt.values)) if (value) values[key] = value;

    let parts: PartRow[] = [];
    try {
      parts = (JSON.parse(values.parts || "[]") as PartRow[]).filter((p) => p.name.trim());
    } catch {}

    setScanned({ values, parts: [...parts, ...receipt.parts] });
    setExtras([...extras, ...receipt.extras.map((e) => ({ ...e, key: nextExtraKey++, keep: true }))]);
    setCategory(values.category || "oil");
    setScanCount((n) => n + 1);
    if (queued.length < photos.max) setQueued([...queued, queuePhoto(photo)]);
  }

  // Dropping an extra service moves its price back onto this record, so the
  // records still add up to the receipt total.
  function toggleExtra(key: number, keep: boolean) {
    const extra = extras.find((e) => e.key === key);
    const cost = formRef.current?.elements.namedItem("cost") as HTMLInputElement | null;
    const current = Number(cost?.value.replace(/[$,]/g, ""));
    if (extra && cost && cost.value && Number.isFinite(current)) {
      const change = (Number(extra.cost) || 0) * (keep ? -1 : 1);
      cost.value = Math.max(0, current + change).toFixed(2);
    }
    setExtras(extras.map((e) => (e.key === key ? { ...e, keep } : e)));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-6 space-y-5 rounded-lg border border-graphite bg-panel p-5 sm:p-6"
    >
      {!photos.target && photos.locked && (
        <div className="rounded-md border border-graphite bg-carbon p-4">
          <ConfirmEmailNote action="scan receipts and add photos" />
        </div>
      )}
      {!photos.target && !photos.locked && (
        <ReceiptScanner
          scan={scanServiceReceipt}
          intro="Have a receipt? Scan it and the form fills itself in."
          label="Scan receipt"
          onScanned={applyScan}
        />
      )}

      <div key={scanCount} className="space-y-5">
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

        <PartsFieldset initial={scanned?.parts ?? initialParts} label="Parts used (optional)" />
      </div>

      {extras.length > 0 && (
        <fieldset>
          <legend className="field-label">Other services on this receipt</legend>
          <span className="field-hint mt-0.5">
            Each one you keep is saved as its own record with the same date, mileage, and shop.
          </span>
          <input
            type="hidden"
            name="extraServices"
            value={JSON.stringify(
              extras.filter((e) => e.keep).map(({ category, title, cost }) => ({ category, title, cost })),
            )}
          />
          <ul className="mt-2 divide-y divide-graphite rounded-md border border-graphite">
            {extras.map((e) => (
              <li key={e.key}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={e.keep}
                    onChange={(ev) => toggleExtra(e.key, ev.target.checked)}
                    className="h-4 w-4 shrink-0 accent-redline"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${e.keep ? "" : "text-steel line-through"}`}>
                      {e.title}
                    </span>
                    {categoryLabel(e.category, customTypes) !== e.title && (
                      <span className="block text-xs text-steel">
                        {categoryLabel(e.category, customTypes)}
                      </span>
                    )}
                  </span>
                  <span className={`text-sm tabular-nums ${e.keep ? "" : "text-steel"}`}>
                    {Number(e.cost) > 0 ? `$${e.cost}` : e.cost ? "No charge" : "No price"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

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
