"use client";

import { CAR_MAKES, closestModel, findMake } from "@/lib/car-catalog";

const NOT_LISTED = "__not-listed";

// A choice of make and model. `listed` is false once the owner picks "isn't
// listed" and types the name in instead.
export type CarChoice = {
  make: string;
  makeListed: boolean;
  model: string;
  modelListed: boolean;
};

export const NO_CAR: CarChoice = { make: "", makeListed: true, model: "", modelListed: true };

// Maps a VIN lookup onto the lists, falling back to the typed names it found.
export function choiceFromVin(make: string, model: string): CarChoice {
  const listedMake = findMake(make);
  if (!listedMake) return { make, makeListed: false, model, modelListed: false };
  const listedModel = closestModel(listedMake, model);
  return listedModel
    ? { make: listedMake.name, makeListed: true, model: listedModel, modelListed: true }
    : { make: listedMake.name, makeListed: true, model, modelListed: false };
}

export function CarPicker({
  value,
  onChange,
}: {
  value: CarChoice;
  onChange: (next: CarChoice) => void;
}) {
  const make = findMake(value.make);

  return (
    <>
      <label className="block">
        <span className="field-label">Make</span>
        <select
          name={value.makeListed ? "make" : undefined}
          required={value.makeListed}
          value={value.makeListed ? value.make : NOT_LISTED}
          onChange={(e) => {
            const picked = e.target.value;
            onChange(
              picked === NOT_LISTED
                ? { make: "", makeListed: false, model: "", modelListed: false }
                : { ...NO_CAR, make: picked },
            );
          }}
          className="field mt-1"
        >
          <option value="">Choose a make</option>
          {CAR_MAKES.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
          <option value={NOT_LISTED}>Not listed</option>
        </select>
      </label>

      <label className="block">
        <span className="field-label">Model</span>
        {value.makeListed && value.modelListed ? (
          <select
            name="model"
            required
            disabled={!make}
            value={value.model}
            onChange={(e) =>
              onChange(
                e.target.value === NOT_LISTED
                  ? { ...value, model: "", modelListed: false }
                  : { ...value, model: e.target.value },
              )
            }
            className="field mt-1 disabled:opacity-60"
          >
            <option value="">{make ? "Choose a model" : "Choose a make first"}</option>
            {make?.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {make && <option value={NOT_LISTED}>Not listed</option>}
          </select>
        ) : (
          <input
            name="model"
            required
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            placeholder="Your model"
            className="field mt-1"
          />
        )}
      </label>

      {!value.makeListed && (
        <label className="block sm:col-span-3">
          <span className="field-label">Make name</span>
          <input
            name="make"
            required
            value={value.make}
            onChange={(e) => onChange({ ...value, make: e.target.value })}
            placeholder="Your make"
            className="field mt-1"
          />
        </label>
      )}

      {(!value.makeListed || !value.modelListed) && (
        <button
          type="button"
          onClick={() => onChange(NO_CAR)}
          className="min-h-11 justify-self-start text-sm text-steel hover:text-chalk sm:col-span-3"
        >
          Choose from the list instead
        </button>
      )}
    </>
  );
}
