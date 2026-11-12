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
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { ReceiptScanner } from "@/components/receipt-scanner";
import type { PartRow } from "@/lib/part-rows";
import { localToday } from "@/lib/local-date";
import { MOD_CATEGORIES, MOD_STATUSES } from "@/lib/mod-categories";
import type { ScannedMod } from "@/lib/mod-scan";
import { scanModPhoto, type ModFormState } from "../actions";

const inputClass = "field mt-1";

// Used for both adding and editing; `initial` holds an existing mod's values.
export function ModForm({
  action,
  currentMileage,
  initial,
  initialParts = [],
  photos,
  submitLabel = "Save mod",
}: {
  action: (prev: ModFormState, formData: FormData) => Promise<ModFormState>;
  currentMileage: number;
  initial?: Record<string, string>;
  initialParts?: PartRow[];
  photos: FormPhotos;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [queued, setQueued] = useState<QueuedPhoto[]>([]);
  const [state, formAction, pending] = useActionState(
    async (prev: ModFormState, fd: FormData) => {
      if (queued.length > 0) fd.set("stay", "1");
      const result = await action(prev, fd);
      if (result?.savedId) {
        const ok = await uploadQueued(photos.vehicleId, "mod", result.savedId, queued);
        router.push(
          ok
            ? `/garage/${photos.vehicleId}`
            : `/garage/${photos.vehicleId}/mods/${result.savedId}/edit?photos=failed`,
        );
      }
      return result;
    },
    undefined,
  );
  // Stays busy while the new mod's photos upload and the page changes.
  const busy = pending || !!state?.savedId;
  // A scanned photo replaces the starting values; the fields remount to show them.
  const [scanned, setScanned] = useState<{ values: Record<string, string>; parts: PartRow[] }>();
  const [scanCount, setScanCount] = useState(0);
  const v = state?.values ?? scanned?.values ?? initial ?? {};
  const [status, setStatus] = useState(v.status || "installed");
  const dateRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // New mods default the install date to today, in the user's own time zone.
  useEffect(() => {
    if (!initial && dateRef.current && !dateRef.current.value) {
      dateRef.current.value = localToday();
    }
  }, [initial, state, status, scanCount]);

  // Keeps what the user already typed wherever the photo had nothing,
  // and adds the photo's items after any parts already listed.
  function applyScan(mod: ScannedMod, photo: File) {
    const fd = new FormData(formRef.current!);
    const values: Record<string, string> = {};
    for (const [key, value] of fd) if (typeof value === "string") values[key] = value;
    for (const [key, value] of Object.entries(mod.values)) if (value) values[key] = value;

    let parts: PartRow[] = [];
    try {
      parts = (JSON.parse(values.parts || "[]") as PartRow[]).filter((p) => p.name.trim());
    } catch {}

    setScanned({ values, parts: [...parts, ...mod.parts] });
    setStatus(values.status || "installed");
    setScanCount((n) => n + 1);
    if (queued.length < photos.max) setQueued([...queued, queuePhoto(photo)]);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-6 space-y-5 rounded-2xl border border-graphite bg-panel p-5 sm:p-6"
    >
      {!photos.target && photos.locked && (
        <div className="rounded-md border border-graphite bg-carbon p-4">
          <ConfirmEmailNote action="scan receipts and add photos" />
        </div>
      )}
      {!photos.target && !photos.locked && (
        <ReceiptScanner
          scan={scanModPhoto}
          intro="Have an order email, receipt, or listing? Scan a screenshot and the form fills itself in."
          label="Scan a photo"
          onScanned={applyScan}
        />
      )}

      <div key={scanCount} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Part</span>
            <input
              name="part"
              required
              placeholder="Cold air intake"
              defaultValue={v.part}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="field-label">Brand (optional)</span>
            <input name="brand" placeholder="K&N" defaultValue={v.brand} className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Category</span>
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
          <label className="block">
            <span className="field-label">Status</span>
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
            <label className="block">
              <span className="field-label">Install date (optional)</span>
              <input
                ref={dateRef}
                type="date"
                name="installedOn"
                defaultValue={v.installedOn}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="field-label">Mileage at install (optional)</span>
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

        <label className="block">
          <span className="field-label">
            {status === "planned" ? "Estimated cost (optional)" : "Cost (optional)"}
          </span>
          <input
            name="cost"
            inputMode="decimal"
            placeholder="$349.99"
            defaultValue={v.cost}
            className={inputClass}
          />
          <span className="field-hint">Leave blank to use the parts total.</span>
        </label>

        <label className="block">
          <span className="field-label">Notes (optional)</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Part number, where you bought it, install tips…"
            defaultValue={v.notes}
            className={inputClass}
          />
        </label>

        <PartsFieldset
          initial={scanned?.parts ?? initialParts}
          label={status === "planned" ? "Parts wanted (optional)" : "Parts used (optional)"}
        />
      </div>

      <FormPhotosField
        photos={photos}
        kind="mod"
        label="Photos (optional)"
        hint={`Before and after, or the parts themselves. Up to ${photos.max}.`}
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
