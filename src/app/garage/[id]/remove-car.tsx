"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { removeVehicle } from "../actions";

// Removing a car deletes everything about it, so it asks for the car's name first.
export function RemoveCar({ vehicleId, name }: { vehicleId: string; name: string }) {
  const [typed, setTyped] = useState("");
  const value = typed.trim().toLowerCase();
  const matches = value === name.toLowerCase() || value === "delete";

  return (
    <details className="mt-10 border-t border-graphite pt-6">
      <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-steel hover:text-overdue">
        Remove this car
      </summary>
      <form action={removeVehicle.bind(null, vehicleId)} className="mt-4 space-y-3">
        <p className="max-w-prose text-sm text-steel">
          Permanently deletes {name} with its service history, mods, reminders, parts, photos, and
          any community posts about it. This can&apos;t be undone.
        </p>
        <label className="block">
          <span className="field-label">
            Type <span className="font-medium text-chalk">{name}</span> to confirm
          </span>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="field mt-1 max-w-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!matches}
          className="btn border-transparent bg-overdue-solid text-white hover:border-transparent hover:opacity-90 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove car
        </button>
      </form>
    </details>
  );
}
