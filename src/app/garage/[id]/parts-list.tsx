"use client";

import {
  ExternalLink,
  LineChart,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import type { PartParent, PartWithHistory } from "@/lib/parts";
import {
  addPart,
  editPart,
  refreshPartPrice,
  removePart,
  type PartFormState,
} from "./parts/actions";

const smallInput =
  "field mt-1 min-h-9 px-2 py-1.5 text-sm";

function money(value: number, currency: string | null) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function PartForm({
  action,
  initial,
  submitLabel,
  onDone,
}: {
  action: (prev: PartFormState, fd: FormData) => Promise<PartFormState>;
  initial?: Record<string, string>;
  submitLabel: string;
  onDone: (warning?: string) => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: PartFormState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) onDone(result.warning);
    return result;
  }, undefined);
  const v = state?.values ?? initial ?? {};
  const [track, setTrack] = useState(v.trackPrice === "on" || v.trackPrice === "true");

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-graphite p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_4.5rem_6rem]">
        <label className="text-xs text-steel">
          Part
          <input
            name="name"
            required
            placeholder="Oil filter"
            defaultValue={v.name}
            className={smallInput}
          />
        </label>
        <label className="text-xs text-steel">
          Qty
          <input
            name="quantity"
            inputMode="numeric"
            defaultValue={v.quantity || "1"}
            className={smallInput}
          />
        </label>
        <label className="text-xs text-steel">
          Price
          <input
            name="price"
            inputMode="decimal"
            placeholder="$24.99"
            defaultValue={v.price}
            className={smallInput}
          />
        </label>
      </div>
      <label className="block text-xs text-steel">
        Link (optional)
        <input
          name="url"
          inputMode="url"
          placeholder="https://store.com/part"
          defaultValue={v.url}
          className={smallInput}
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          name="trackPrice"
          checked={track}
          onChange={(e) => setTrack(e.target.checked)}
          className="accent-redline"
        />
        Track price daily from the link
      </label>
      {state?.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary min-h-8 px-2.5 text-xs"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className="btn min-h-8 border-transparent px-2.5 text-xs text-steel hover:text-chalk"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function PriceTrend({ part }: { part: PartWithHistory }) {
  const price = part.price == null ? null : Number(part.price);
  if (price == null || part.firstPrice == null || price === part.firstPrice) return null;
  const diff = price - part.firstPrice;
  const down = diff < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-0.5 ${down ? "text-done" : "text-due"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {money(Math.abs(diff), part.currency)} since added
    </span>
  );
}

function PartRow({ vehicleId, part }: { vehicleId: string; part: PartWithHistory }) {
  const [editing, setEditing] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const price = part.price == null ? null : Number(part.price);

  if (editing) {
    return (
      <li>
        <PartForm
          action={editPart.bind(null, vehicleId, part.id)}
          submitLabel="Save part"
          onDone={(warning) => {
            setEditing(false);
            setCheckError(warning ?? null);
          }}
          initial={{
            name: part.name,
            url: part.url ?? "",
            quantity: part.quantity.toString(),
            price: part.price ?? "",
            trackPrice: part.trackPrice ? "on" : "",
          }}
        />
      </li>
    );
  }

  const error = checkError ?? part.lastCheckError;
  return (
    <li className="py-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5">
            {part.quantity > 1 && <span className="text-steel">{part.quantity}×</span>}
            {part.url ? (
              <a
                href={part.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 truncate hover:text-redline"
              >
                {part.name}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-steel" aria-hidden />
              </a>
            ) : (
              <span className="truncate">{part.name}</span>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-steel">
            {price != null && (
              <span className="font-medium text-chalk">
                {money(price * part.quantity, part.currency)}
                {part.quantity > 1 && (
                  <span className="font-normal text-steel">
                    {" "}
                    ({money(price, part.currency)} each)
                  </span>
                )}
              </span>
            )}
            <PriceTrend part={part} />
            {part.trackPrice && part.lowestPrice != null && price !== part.lowestPrice && (
              <span>Lowest {money(part.lowestPrice, part.currency)}</span>
            )}
            {part.trackPrice && (
              <span className="inline-flex items-center gap-1">
                <LineChart className="h-3.5 w-3.5" aria-hidden />
                {part.lastCheckedAt
                  ? `Checked ${new Date(part.lastCheckedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Tracking"}
              </span>
            )}
          </p>
          {error && <p className="mt-0.5 text-xs text-overdue">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center">
          {part.url && (
            <button
              type="button"
              aria-label="Check price now"
              title="Check price now"
              disabled={checking}
              onClick={() =>
                startCheck(async () => {
                  const result = await refreshPartPrice(vehicleId, part.id);
                  setCheckError(result?.error ?? null);
                })
              }
              className="icon-btn disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-label="Edit part"
            title="Edit part"
            onClick={() => setEditing(true)}
            className="icon-btn"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <form
            action={removePart.bind(null, vehicleId, part.id)}
            onSubmit={(e) => {
              if (!confirm("Delete this part?")) e.preventDefault();
            }}
          >
            <button
              type="submit"
              aria-label="Delete part"
              title="Delete part"
              className="icon-btn icon-btn-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

// Parts used (service records) or used/wanted (mods), with links and prices.
export function PartsList({
  vehicleId,
  parent,
  parts,
  label,
}: {
  vehicleId: string;
  parent: PartParent;
  parts: PartWithHistory[];
  label: string;
}) {
  const [adding, setAdding] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const total = parts.reduce((sum, p) => sum + (p.price ? Number(p.price) * p.quantity : 0), 0);

  return (
    <div className="mt-3 border-l-2 border-graphite pl-3">
      {parts.length > 0 && (
        <>
          <p className="text-xs text-steel">
            {label} · {parts.length} {parts.length === 1 ? "part" : "parts"}
            {total > 0 && ` · ${money(total, parts[0].currency)}`}
          </p>
          <ul className="divide-y divide-graphite">
            {parts.map((p) => (
              <PartRow key={p.id} vehicleId={vehicleId} part={p} />
            ))}
          </ul>
        </>
      )}
      {warning && (
        <p className="mt-1 text-xs text-due">
          Saved, but {warning.charAt(0).toLowerCase() + warning.slice(1)}
        </p>
      )}
      {adding ? (
        <PartForm
          action={addPart.bind(null, vehicleId, parent)}
          submitLabel="Add part"
          onDone={(w) => {
            setAdding(false);
            setWarning(w ?? null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setWarning(null);
          }}
          className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs text-steel hover:text-chalk"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add part
        </button>
      )}
    </div>
  );
}
