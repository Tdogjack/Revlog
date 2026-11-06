"use client";

import { useSyncExternalStore } from "react";
import { BASE_PALETTE, DEFAULT_PALETTE, PALETTE_STORAGE_KEY, palettes } from "@/lib/palettes";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentPalette() {
  return document.documentElement.dataset.theme ?? BASE_PALETTE;
}

function choosePalette(id: string) {
  if (id === BASE_PALETTE) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    // Private browsing can block storage. The palette still applies until reload.
  }
  listeners.forEach((listener) => listener());
}

export function PalettePicker() {
  const current = useSyncExternalStore(subscribe, currentPalette, () => DEFAULT_PALETTE);

  return (
    <fieldset>
      <legend className="text-sm font-medium">Color palette</legend>
      <p className="field-hint mt-1">Saved in this browser. Changes apply right away.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {palettes.map(({ id, name, description, swatches }) => (
          <label
            key={id}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:border-steel ${
              current === id ? "border-redline" : "border-edge"
            }`}
          >
            <input
              type="radio"
              name="palette"
              checked={current === id}
              onChange={() => choosePalette(id)}
              className="h-4 w-4 shrink-0 accent-redline"
            />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium">{name}</span>
              <span className="block text-steel">{description}</span>
            </span>
            <span aria-hidden="true" className="flex shrink-0">
              {swatches.map((color) => (
                <span
                  key={color}
                  className="-ml-1 h-5 w-5 rounded-full border border-edge first:ml-0"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
