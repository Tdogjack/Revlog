"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { PhotoPicker } from "@/components/photo-picker";
import { withResizedPhoto } from "@/lib/resize-image";
import { buildServicePlan, DEFAULT_ANSWERS } from "@/lib/service-plan";
import type { FormState } from "../actions";
import { CarPicker, choiceFromVin, NO_CAR } from "./car-picker";
import { DrivingQuestions, ServicePlanPreview } from "./service-plan-section";
import { lookUpVin } from "./vin-actions";

const inputClass = "field mt-1";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
    <label className="block">
      <span className="field-label">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputClass} {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// Used for both adding and editing; `initial` holds an existing car's values.
// Editing leaves the photo to the car page's own controls.
export function VehicleForm({
  action,
  initial,
  submitLabel = "Add to garage",
  pendingLabel = "Adding…",
  canUpload = true,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Record<string, string>;
  submitLabel?: string;
  pendingLabel?: string;
  // False until the account's email is confirmed.
  canUpload?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const v = state?.values ?? initial ?? {};
  const error = photoError ?? state?.error;
  const formRef = useRef<HTMLFormElement>(null);
  const [looking, startLookup] = useTransition();
  const [vinNote, setVinNote] = useState<{ ok: boolean; text: string } | null>(null);
  // Adding a car picks the make and model from lists, and the year shapes the
  // service plan. Editing keeps plain text, since older cars may not be listed.
  const isNew = !initial;
  const [year, setYear] = useState(v.year ?? "");
  const [car, setCar] = useState(NO_CAR);
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const plan = buildServicePlan({ year, make: car.make, model: car.model }, answers);
  const carChosen = car.make.trim() !== "" && car.model.trim() !== "";

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
      const fields = isNew ? (["trim"] as const) : (["year", "make", "model", "trim"] as const);
      for (const key of fields) {
        const input = form.elements.namedItem(key) as HTMLInputElement;
        if (result[key]) input.value = result[key];
      }
      if (isNew) {
        setYear(result.year);
        setCar(choiceFromVin(result.make, result.model));
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
      // Not the action prop: React would reset the form after a failed save and
      // wipe the car and answers picked so far.
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="mt-6 space-y-5"
    >
      <section
        aria-label="Car details"
        className="space-y-5 rounded-lg border border-graphite bg-panel p-5 sm:p-6"
      >
        {!initial &&
          (canUpload ? (
            <PhotoPicker />
          ) : (
            <ConfirmEmailNote action="add a photo" />
          ))}
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
          {isNew ? (
            <>
              <Field
                label="Year"
                name="year"
                inputMode="numeric"
                placeholder="2019"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
              <CarPicker value={car} onChange={setCar} />
            </>
          ) : (
            <>
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
            </>
          )}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Current mileage"
            name="currentMileage"
            inputMode="numeric"
            placeholder="48,210"
            required
            defaultValue={v.currentMileage}
          />
          <fieldset className="text-sm">
            <legend className="text-steel">Built (optional)</legend>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <select
                name="builtMonth"
                aria-label="Month built"
                defaultValue={v.builtMonth ?? ""}
                className={inputClass}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                name="builtYear"
                aria-label="Year built"
                inputMode="numeric"
                placeholder="2019"
                maxLength={4}
                defaultValue={v.builtYear}
                className={inputClass}
              />
            </div>
            <span className="field-hint">
              On the door jamb sticker, like MFD 06/19.
            </span>
          </fieldset>
        </div>
      </section>

      {isNew && carChosen && (
        <>
          {plan.source === "make" && <DrivingQuestions answers={answers} onChange={setAnswers} />}
          <ServicePlanPreview plan={plan} />
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-overdue">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg w-full"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
