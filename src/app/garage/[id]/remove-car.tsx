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
    <details className="mt-6 rounded-xl border border-overdue/40 bg-panel p-5">
      <summary className="cursor-pointer text-sm font-medium text-overdue">Remove this car</summary>
      <form action={removeVehicle.bind(null, vehicleId)} className="mt-4 space-y-3">
        <p className="text-sm text-steel">
          Permanently deletes {name} with its service history, mods, reminders, parts, photos, and
          any community posts about it. This can&apos;t be undone.
        </p>
        <label className="block text-sm">
          <span className="text-steel">
            Type <span className="font-medium text-chalk">{name}</span> to confirm
          </span>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full max-w-sm rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-overdue"
          />
        </label>
        <button
          type="submit"
          disabled={!matches}
          className="flex items-center gap-1.5 rounded-md bg-overdue-solid px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove car
        </button>
      </form>
    </details>
  );
}
