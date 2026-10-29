"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { withResizedPhoto } from "@/lib/resize-image";
import { addVehicle } from "../actions";
import { lookUpVin } from "./vin-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

function Field({
  label,
  name,
  defaultValue,
  hint,
  ...props
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="text-steel">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputClass} {...props} />
      {hint && <span className="mt-1 block text-xs text-steel">{hint}</span>}
    </label>
  );
}

export function VehicleForm() {
  const [state, formAction, pending] = useActionState(addVehicle, undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const v = state?.values ?? {};
  const error = photoError ?? state?.error;
  const formRef = useRef<HTMLFormElement>(null);
  const [looking, startLookup] = useTransition();
  const [vinNote, setVinNote] = useState<{ ok: boolean; text: string } | null>(null);

  function fillFromVin() {
    const form = formRef.current;
    if (!form) return;
    const vin = (form.elements.namedItem("vin") as HTMLInputElement).value;
    setVinNote(null);
    startLookup(async () => {
      const result = await lookUpVin(vin);
      if ("error" in result) {
        setVinNote({ ok: false, text: result.error });
        return;
      }
      for (const key of ["year", "make", "model", "trim"] as const) {
        const input = form.elements.namedItem(key) as HTMLInputElement;
        if (result[key]) input.value = result[key];
      }
      setVinNote({
        ok: true,
        text: `Found a ${[result.year, result.make, result.model, result.trim].filter(Boolean).join(" ")}. Check the details below.`,
      });
    });
  }

  async function submit(formData: FormData) {
    setPhotoError(null);
    try {
      await withResizedPhoto(formData);
    } catch (err) {
      setPhotoError((err as Error).message);
      return;
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6"
    >
      {/* The form resets after each submit, so remount the picker to clear its preview too. */}
      <PhotoPicker key={state?.error ?? "initial"} />
      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="VIN (optional)"
              name="vin"
              placeholder="2HGFC1E50KH700000"
              autoCapitalize="characters"
              spellCheck={false}
              defaultValue={v.vin}
            />
          </div>
          <button
            type="button"
            onClick={fillFromVin}
            disabled={looking}
            className="rounded-md border border-graphite px-3 py-2 text-sm hover:border-steel disabled:opacity-60"
          >
            {looking ? "Looking up…" : "Look up"}
          </button>
        </div>
        <p
          className={`mt-1 text-xs ${vinNote ? (vinNote.ok ? "text-done" : "text-overdue") : "text-steel"}`}
        >
          {vinNote?.text ??
            "17 characters, usually on the driver's side dash or door jamb. Look up fills in the car for you."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
        <Field
          label="Year"
          name="year"
          inputMode="numeric"
          placeholder="2019"
          required
          defaultValue={v.year}
        />
        <Field label="Make" name="make" placeholder="Honda" required defaultValue={v.make} />
        <Field label="Model" name="model" placeholder="Civic" required defaultValue={v.model} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trim (optional)" name="trim" placeholder="Si" defaultValue={v.trim} />
        <Field
          label="Nickname (optional)"
          name="nickname"
          placeholder="Daily driver"
          defaultValue={v.nickname}
        />
      </div>
      <Field
        label="Current mileage"
        name="currentMileage"
        inputMode="numeric"
        placeholder="48,210"
        required
        defaultValue={v.currentMileage}
      />

      {error && (
        <p role="alert" className="text-sm text-overdue">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-redline py-2.5 font-medium text-white hover:bg-redline-hover disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add to garage"}
      </button>
    </form>
  );
}
