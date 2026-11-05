"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import {
  cellText,
  columnName,
  COLUMN_FIELDS,
  layoutIsComplete,
  layoutNeedsDateOrder,
  sheetHasRows,
  type ColumnField,
  type Layout,
} from "@/lib/spreadsheet";
import type { OpenSheet } from "./import-flow";

function sentence(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")}${list.length > 2 ? "," : ""} and ${list.at(-1)}`;
}

// How a spreadsheet was understood, sheet by sheet. Stays folded when every
// sheet that holds a log was read, and opens when it needs the user's help.
export function SheetPanel({
  open,
  canScan,
  reading,
  onChangeLayout,
  onChangeSheet,
  onReadWithAi,
}: {
  open: OpenSheet;
  canScan: boolean;
  reading: boolean;
  onChangeLayout: (layout: Layout) => void;
  onChangeSheet: (index: number) => void;
  onReadWithAi: () => void;
}) {
  const { fileName, sheets, layouts, selected, counts, skippedFuel } = open;
  const sheet = sheets[selected];
  const layout = layouts[selected];
  const manySheets = sheets.length > 1;
  const nothingRead = counts.every((n) => n === 0);
  const [expanded, setExpanded] = useState(false);
  const showDetails = expanded || nothingRead;
  const readByAi = layout.aiCount !== undefined;
  const needsColumns = layout.include && !readByAi && !layoutIsComplete(layout);
  const data = sheet.rows.slice(layout.headerRow + 1);

  const read = sheets.flatMap((s, i) => (counts[i] > 0 ? [`${s.name} (${counts[i]})`] : []));
  const leftOut = sheets.flatMap((s, i) => (counts[i] === 0 ? [s.name] : []));

  // Columns with nothing in them only add noise.
  const columns = layout.columns.flatMap((field, index) => {
    const sample = data.map((r) => cellText(r[index])).find(Boolean);
    return sample ? [{ field, index, sample }] : [];
  });

  function setColumn(index: number, field: ColumnField) {
    const next = [...layout.columns];
    // One date column: choosing a new one sends the old one to the notes.
    if (field === "date") next.forEach((f, i) => f === "date" && (next[i] = "notes"));
    next[index] = field;
    onChangeLayout({ ...layout, columns: next });
  }

  const sheetLabel = (i: number) => {
    if (counts[i] > 0) return `${sheets[i].name} (${counts[i]})`;
    return sheetHasRows(sheets[i], layouts[i]) ? `${sheets[i].name} (left out)` : `${sheets[i].name} (empty)`;
  };

  return (
    <section aria-labelledby="sheet-heading" className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sheet-heading" className="font-display text-xl leading-tight font-semibold break-words">
            {fileName}
          </h2>
          <p className={`mt-1 text-sm ${nothingRead ? "text-due" : "text-steel"}`}>
            {nothingRead
              ? "Tell us which column holds the date and which holds the work done."
              : manySheets
                ? `Read ${sentence(read)}.`
                : "Columns matched by their headings. Anything without a match goes in the notes."}
            {skippedFuel > 0 && ` Left out ${skippedFuel} fuel ${skippedFuel === 1 ? "entry" : "entries"}.`}
          </p>
          {manySheets && !nothingRead && leftOut.length > 0 && (
            <p className="mt-1 text-sm text-steel">
              Left out {sentence(leftOut)}, which {leftOut.length === 1 ? "doesn't" : "don't"} list
              dated services.
            </p>
          )}
        </div>
        {!nothingRead && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="btn"
          >
            {expanded ? "Hide details" : manySheets ? "Check sheets" : "Check columns"}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-4 space-y-4">
          {manySheets && (
            <div className="space-y-2">
              <label className="block">
                <span className="field-label">Sheet</span>
                <select
                  value={selected}
                  onChange={(e) => onChangeSheet(Number(e.target.value))}
                  className="field mt-1"
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {sheetLabel(i)}
                    </option>
                  ))}
                </select>
              </label>
              {!readByAi && sheetHasRows(sheet, layout) && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={layout.include}
                    onChange={(e) => onChangeLayout({ ...layout, include: e.target.checked })}
                    className="h-4 w-4 shrink-0 accent-redline"
                  />
                  Bring in this sheet
                </label>
              )}
              {needsColumns && (
                <p className="text-sm text-due">
                  Tell us which column holds the date and which holds the work done.
                </p>
              )}
            </div>
          )}

          {readByAi && <p className="text-sm text-steel">This sheet was read with AI.</p>}
          {!readByAi && !sheetHasRows(sheet, layout) && (
            <p className="text-sm text-steel">This sheet has no rows to bring in.</p>
          )}

          {!readByAi && sheetHasRows(sheet, layout) && (
            <>
              <ul className="divide-y divide-rule border-y border-rule">
                {columns.map(({ field, index, sample }) => (
                  <li key={index} className="grid items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[1fr_11rem]">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words">{columnName(sheet, layout, index)}</p>
                      <p className="truncate text-xs text-steel">{sample}</p>
                    </div>
                    <select
                      value={field}
                      aria-label={`What ${columnName(sheet, layout, index)} holds`}
                      onChange={(e) => setColumn(index, e.target.value as ColumnField)}
                      className="field"
                    >
                      {COLUMN_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>

              <div className="grid gap-4 sm:grid-cols-2">
                {layoutNeedsDateOrder(sheet, layout) && (
                  <label className="block">
                    <span className="field-label">A date like 03/04/2021 means</span>
                    <select
                      value={layout.dateOrder}
                      onChange={(e) =>
                        onChangeLayout({ ...layout, dateOrder: e.target.value as Layout["dateOrder"] })
                      }
                      className="field mt-1"
                    >
                      <option value="mdy">March 4</option>
                      <option value="dmy">April 3</option>
                    </select>
                  </label>
                )}
                {layout.columns.includes("mileage") && (
                  <label className="block">
                    <span className="field-label">Mileage is in</span>
                    <select
                      value={layout.unit}
                      onChange={(e) => onChangeLayout({ ...layout, unit: e.target.value as Layout["unit"] })}
                      className="field mt-1"
                    >
                      <option value="mi">Miles</option>
                      <option value="km">Kilometers, convert to miles</option>
                    </select>
                  </label>
                )}
              </div>

              {canScan && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                  <p className="max-w-prose text-sm text-steel">
                    Laid out some other way, like one column per service? Have it read for you.
                  </p>
                  <button type="button" onClick={onReadWithAi} disabled={reading} className="btn" aria-busy={reading}>
                    {reading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                    {reading ? "Reading sheet…" : "Read it with AI"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
