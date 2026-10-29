"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { PartRow } from "@/lib/part-rows";

const smallInput =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-2 py-1.5 text-sm outline-none focus:border-redline";

type KeyedRow = PartRow & { key: number };

let nextKey = 0;
const blankRow = (): KeyedRow => ({
  key: nextKey++,
  name: "",
  url: "",
  quantity: "1",
  price: "",
  trackPrice: false,
});

// Editable list of parts inside the service and mod forms. Rows are sent as
// JSON in one hidden "parts" field; the server saves them with the record.
export function PartsFieldset({ initial = [], label }: { initial?: PartRow[]; label: string }) {
  const [rows, setRows] = useState<KeyedRow[]>(() =>
    initial.map((r) => ({ ...r, key: nextKey++ })),
  );

  const update = (key: number, patch: Partial<PartRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-steel">{label}</legend>
      <input
        type="hidden"
        name="parts"
        value={JSON.stringify(rows, (k, v) => (k === "key" ? undefined : v))}
      />

      {rows.map((row, i) => (
        <div key={row.key} className="space-y-2 rounded-lg border border-graphite p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_4.5rem_6rem]">
              <label className="text-xs text-steel">
                Part {i + 1}
                <input
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  placeholder="Oil filter"
                  className={smallInput}
                />
              </label>
              <label className="text-xs text-steel">
                Qty
                <input
                  value={row.quantity}
                  inputMode="numeric"
                  onChange={(e) => update(row.key, { quantity: e.target.value })}
                  className={smallInput}
                />
              </label>
              <label className="text-xs text-steel">
                Price
                <input
                  value={row.price}
                  inputMode="decimal"
                  placeholder="$24.99"
                  onChange={(e) => update(row.key, { price: e.target.value })}
                  className={smallInput}
                />
              </label>
            </div>
            <button
              type="button"
              aria-label={`Remove part ${i + 1}`}
              onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
              className="mt-5 text-steel hover:text-overdue"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <label className="block text-xs text-steel">
            Link (optional)
            <input
              value={row.url}
              inputMode="url"
              placeholder="https://store.com/part"
              onChange={(e) => update(row.key, { url: e.target.value })}
              className={smallInput}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={row.trackPrice}
              onChange={(e) => update(row.key, { trackPrice: e.target.checked })}
              className="accent-redline"
            />
            Track price daily from the link
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, blankRow()])}
        className="inline-flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm hover:border-steel"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add part
      </button>
    </fieldset>
  );
}
