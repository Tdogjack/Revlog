"use client";

import { startTransition, useActionState, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { withResizedPhoto } from "@/lib/resize-image";
import { addVehicle } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

function Field({
  label,
  name,
  defaultValue,
  hint,
  ...props
}: { label: string; name: string; defaultValue?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
    <form action={submit} className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6">
      {/* The form resets after each submit, so remount the picker to clear its preview too. */}
      <PhotoPicker key={state?.error ?? "initial"} />
      <div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
        <Field label="Year" name="year" inputMode="numeric" placeholder="2019" required defaultValue={v.year} />
        <Field label="Make" name="make" placeholder="Honda" required defaultValue={v.make} />
        <Field label="Model" name="model" placeholder="Civic" required defaultValue={v.model} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trim (optional)" name="trim" placeholder="Si" defaultValue={v.trim} />
        <Field label="Nickname (optional)" name="nickname" placeholder="Daily driver" defaultValue={v.nickname} />
      </div>
      <Field
        label="Current mileage"
        name="currentMileage"
        inputMode="numeric"
        placeholder="48,210"
        required
        defaultValue={v.currentMileage}
      />
      <Field
        label="VIN (optional)"
        name="vin"
        placeholder="2HGFC1E50KH700000"
        hint="17 characters, usually on the driver's side dash or door jamb."
        defaultValue={v.vin}
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
