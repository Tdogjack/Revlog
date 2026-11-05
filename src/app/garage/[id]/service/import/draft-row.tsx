"use client";

import { useId } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { draftProblem, type DraftRecord } from "@/lib/history-draft";
import { categoryLabel, SERVICE_CATEGORIES, type CustomType } from "@/lib/service-categories";

const inputClass = "field mt-1";

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// One record waiting to be saved: a summary line that opens to every field.
export function DraftRow({
  draft,
  today,
  customTypes,
  open,
  onToggleOpen,
  onChange,
  onRemove,
}: {
  draft: DraftRecord;
  today: string | null;
  customTypes: CustomType[];
  open: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<DraftRecord>) => void;
  onRemove: () => void;
}) {
  const fieldsId = useId();
  const title = draft.title || categoryLabel(draft.category, customTypes);
  const problem = draft.include && today ? draftProblem(draft, today) : null;
  const facts = [
    draft.servicedOn ? formatDate(draft.servicedOn) : null,
    draft.mileage ? `${Number(draft.mileage.replace(/\D/g, "")).toLocaleString("en-US")} mi` : null,
    draft.shop || null,
    draft.notes ? "notes" : null,
    draft.parts.length > 0 ? `${draft.parts.length} ${draft.parts.length === 1 ? "part" : "parts"}` : null,
  ].filter(Boolean);

  return (
    <li id={`draft-${draft.key}`}>
      <div className="flex items-start gap-1">
        <label className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={draft.include}
            onChange={(e) => onChange({ include: e.target.checked })}
            aria-label={`Save ${title}${draft.servicedOn ? ` on ${formatDate(draft.servicedOn)}` : ""}`}
            className="h-4 w-4 accent-redline"
          />
        </label>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={fieldsId}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-2 py-2 text-left font-normal"
        >
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold ${draft.include ? "" : "text-steel"}`}>
              {title}
            </span>
            <span className="block text-xs text-steel">
              {facts.join(", ") || "No details yet"}
            </span>
            {draft.duplicate && !draft.include && (
              <span className="block text-xs text-steel">Already logged, so it&apos;s unticked</span>
            )}
            {problem && !open && <span className="block text-xs text-due">{problem}</span>}
          </span>
          {draft.cost && (
            <span className={`readout shrink-0 text-sm ${draft.include ? "" : "text-steel"}`}>
              ${Number(draft.cost.replace(/[$,\s]/g, "")).toFixed(2)}
            </span>
          )}
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-steel transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div id={fieldsId} className="space-y-4 pt-2 pb-4 pl-10">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Type</span>
              <select
                value={draft.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className={inputClass}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
                {customTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Date</span>
              <input
                type="date"
                required
                value={draft.servicedOn}
                max={today ?? undefined}
                onChange={(e) => onChange({ servicedOn: e.target.value })}
                className={inputClass}
              />
              {problem && <span className="field-hint text-due">{problem}</span>}
            </label>
          </div>
          <label className="block">
            <span className="field-label">Description (optional)</span>
            <input
              value={draft.title}
              maxLength={100}
              onChange={(e) => onChange({ title: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Mileage (optional)</span>
              <input
                inputMode="numeric"
                value={draft.mileage}
                onChange={(e) => onChange({ mileage: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="field-label">Cost (optional)</span>
              <input
                inputMode="decimal"
                value={draft.cost}
                onChange={(e) => onChange({ cost: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <span className="field-label">Shop (optional)</span>
            <input
              value={draft.shop}
              maxLength={100}
              onChange={(e) => onChange({ shop: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="field-label">Notes (optional)</span>
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className={inputClass}
            />
          </label>
          {draft.parts.length > 0 && (
            <div>
              <p className="field-label">Parts</p>
              <ul className="mt-1 text-sm text-steel">
                {draft.parts.map((p, i) => (
                  <li key={i}>
                    {p.quantity !== "1" && `${p.quantity} x `}
                    {p.name}
                    {p.price && `, $${p.price}`}
                  </li>
                ))}
              </ul>
              <p className="field-hint">You can edit parts on the record after saving.</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs break-words text-steel">
              From {draft.source.replace(/ \(\d+\)$/, "")}
            </p>
            <button type="button" onClick={onRemove} className="btn shrink-0">
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove from list
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
