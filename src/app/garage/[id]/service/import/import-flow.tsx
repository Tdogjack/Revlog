"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, FileUp, LoaderCircle, Plus } from "lucide-react";
import { uploadPhoto } from "@/app/garage/[id]/photos/actions";
import { useAiConsent } from "@/components/ai-consent";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import {
  draftProblem,
  MAX_IMPORT_RECORDS,
  recordMatchKey,
  type DraftFields,
  type DraftRecord,
} from "@/lib/history-draft";
import { PHOTO_ACCEPT, resizeImage } from "@/lib/resize-image";
import type { CustomType } from "@/lib/service-categories";
import {
  guessLayout,
  layoutIsComplete,
  readSheets,
  sheetAsText,
  sheetHasRows,
  sheetToDrafts,
  SHEET_ACCEPT,
  type Layout,
  type Sheet,
} from "@/lib/spreadsheet";
import { useToday } from "@/lib/use-today";
import { saveServiceHistory, scanHistory, scanHistorySheet } from "./actions";
import { DraftRow } from "./draft-row";
import { SheetPanel } from "./sheet-panel";

const panelClass = "rounded-lg border border-graphite bg-panel p-5 sm:p-6";
const ACCEPT = `${PHOTO_ACCEPT},application/pdf,.pdf,${SHEET_ACCEPT}`;
const MAX_PDF_BYTES = 3.5 * 1024 * 1024;

let nextKey = 1;

type Job = {
  key: number;
  name: string;
  status: "reading" | "done" | "attention" | "failed";
  message?: string;
  warning?: string;
};

export type OpenSheet = {
  jobKey: number;
  fileName: string;
  sheets: Sheet[];
  layouts: Layout[];
  // The sheet whose columns are showing.
  selected: number;
  // Services found on each sheet.
  counts: number[];
  skippedFuel: number;
};

type Workbook = Omit<OpenSheet, "counts" | "skippedFuel">;

// Each sheet is its own source, so changing one leaves the others' rows alone.
const sheetSource = (open: Workbook, index: number) =>
  open.sheets.length > 1 ? `${open.fileName}, ${open.sheets[index].name}` : open.fileName;

const isSheetFile = (file: File) => /\.(csv|tsv|txt|xlsx|xls|numbers|ods)$/i.test(file.name);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Undated rows first, since they need attention, then newest first.
const byDate = (a: DraftRecord, b: DraftRecord) => {
  if (!a.servicedOn !== !b.servicedOn) return a.servicedOn ? 1 : -1;
  return b.servicedOn.localeCompare(a.servicedOn);
};

export function ImportFlow({
  vehicleId,
  currentMileage,
  customTypes,
  existing,
  canScan,
  skipLabel,
}: {
  vehicleId: string;
  currentMileage: number;
  customTypes: CustomType[];
  existing: string[];
  canScan: boolean;
  skipLabel: string;
}) {
  const router = useRouter();
  const today = useToday();
  const storageKey = `revlog-history-${vehicleId}`;
  const consent = useAiConsent();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [readingSheet, setReadingSheet] = useState(false);
  const [openKey, setOpenKey] = useState<number | null>(null);
  const [error, setError] = useState<{ text: string; rowKey?: number } | null>(null);
  const [saving, setSaving] = useState<"records" | "photos" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [restored, setRestored] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = useRef(new Map<number, File>());
  const loaded = useRef(false);
  const queue = useRef(Promise.resolve());

  // Scans cost time and a daily allowance, so an unsaved list survives a reload.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    let saved: DraftRecord[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {}
    if (!Array.isArray(saved) || saved.length === 0) return;
    nextKey = Math.max(nextKey, ...saved.map((d) => d.key + 1));
    setDrafts(saved);
    setRestored(saved.length);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      if (drafts.length > 0) {
        const kept = drafts.map((d) => ({ ...d, photoKey: undefined }));
        localStorage.setItem(storageKey, JSON.stringify(kept));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  }, [drafts, storageKey]);

  const existingKeys = useMemo(() => new Set(existing), [existing]);

  // New rows that match a saved record, or a row already listed, start unticked.
  function addDrafts(fields: DraftFields[], source: string, photoKey?: number) {
    setDrafts((current) => {
      const seen = new Set([
        ...existingKeys,
        ...current.filter((d) => d.source !== source).map((d) => recordMatchKey(d, customTypes)),
      ]);
      const added = fields.map((f): DraftRecord => {
        const match = recordMatchKey(f, customTypes);
        const duplicate = !!f.servicedOn && seen.has(match);
        seen.add(match);
        return { ...f, key: nextKey++, include: !duplicate, duplicate, source, photoKey };
      });
      return [...current.filter((d) => d.source !== source), ...added].sort(byDate);
    });
  }

  function updateJob(key: number, patch: Partial<Job>) {
    setJobs((list) => list.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  }

  async function readSheetFile(file: File) {
    const job = nextKey++;
    setJobs((list) => [...list, { key: job, name: file.name, status: "reading" }]);
    try {
      const sheets = await readSheets(file);
      const layouts = sheets.map(guessLayout);
      const included = layouts.findIndex((l) => l.include);
      const withRows = sheets.findIndex((s, i) => sheetHasRows(s, layouts[i]));
      setSheet(
        applyWorkbook({
          jobKey: job,
          fileName: file.name,
          sheets,
          layouts,
          selected: Math.max(included >= 0 ? included : withRows, 0),
        }),
      );
    } catch (err) {
      updateJob(job, {
        status: "failed",
        message: err instanceof Error && err.message ? err.message : "That file couldn't be read.",
      });
    }
  }

  function applyWorkbook(open: Workbook): OpenSheet {
    let skippedFuel = 0;
    const counts = open.sheets.map((sheet, i) => {
      const layout = open.layouts[i];
      if (layout.aiCount !== undefined) return layout.aiCount;
      const read =
        layout.include && layoutIsComplete(layout)
          ? sheetToDrafts(sheet, layout, customTypes)
          : { drafts: [], skippedFuel: 0 };
      skippedFuel += read.skippedFuel;
      addDrafts(read.drafts, sheetSource(open, i));
      return read.drafts.length;
    });

    const total = counts.reduce((sum, n) => sum + n, 0);
    const used = counts.filter((n) => n > 0).length;
    updateJob(open.jobKey, {
      status: total > 0 ? "done" : "attention",
      message:
        total > 0
          ? `${plural(total, "service")} found${used > 1 ? ` across ${used} sheets` : ""}`
          : "Check the columns below",
    });
    return { ...open, counts, skippedFuel };
  }

  async function readScanFile(file: File) {
    const job = nextKey++;
    setJobs((list) => [...list, { key: job, name: file.name, status: "reading" }]);
    if (!canScan) {
      updateJob(job, { status: "failed", message: "Confirm your email to scan photos and PDFs." });
      return;
    }
    try {
      if (!(await consent.ensure())) {
        updateJob(job, { status: "failed", message: "Not sent. Add it by hand instead." });
        return;
      }
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf && file.size > MAX_PDF_BYTES) {
        throw new Error("That PDF is over 3.5 MB. Split it into smaller files and add those.");
      }
      const ready = isPdf
        ? new File([file], file.name, { type: "application/pdf" })
        : await resizeImage(file, 1600);
      const fd = new FormData();
      fd.set("file", ready);
      const result = await scanHistory(fd);
      if ("error" in result) {
        updateJob(job, { status: "failed", message: result.error });
        return;
      }
      let photoKey: number | undefined;
      if (!isPdf) {
        photoKey = nextKey++;
        photos.current.set(photoKey, ready);
      }
      addDrafts(result.data.entries, `${file.name} (${job})`, photoKey);
      updateJob(job, {
        status: "done",
        message: plural(result.data.entries.length, "service") + " found",
        warning: result.data.unreadable ?? undefined,
      });
    } catch (err) {
      updateJob(job, {
        status: "failed",
        message:
          err instanceof Error && err.message
            ? err.message
            : "That file couldn't be read right now. Try it again in a moment.",
      });
    }
  }

  // One at a time, in a queue, since picking more files can happen mid-scan.
  function addFiles(files: File[]) {
    setError(null);
    for (const file of files) {
      queue.current = queue.current.then(() =>
        isSheetFile(file) ? readSheetFile(file) : readScanFile(file),
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeLayout(layout: Layout) {
    if (!sheet) return;
    const layouts = sheet.layouts.map((l, i) => (i === sheet.selected ? layout : l));
    setSheet(applyWorkbook({ ...sheet, layouts }));
  }

  function changeSheet(index: number) {
    if (sheet) setSheet({ ...sheet, selected: index });
  }

  async function readSheetWithAi() {
    if (!sheet) return;
    setError(null);
    const { selected } = sheet;
    const current = sheet.sheets[selected];
    try {
      if (!(await consent.ensure())) return;
      setReadingSheet(true);
      const result = await scanHistorySheet(sheetAsText(current));
      if ("error" in result) {
        setError({ text: result.error });
        return;
      }
      addDrafts(result.data.entries, sheetSource(sheet, selected));
      const layouts = sheet.layouts.map((l, i) =>
        i === selected ? { ...l, include: true, aiCount: result.data.entries.length } : l,
      );
      const updated = applyWorkbook({ ...sheet, layouts });
      setSheet(sheet.sheets.length > 1 ? updated : null);
    } catch {
      setError({ text: "That sheet couldn't be read right now. Try it again in a moment." });
    } finally {
      setReadingSheet(false);
    }
  }

  function addByHand() {
    const key = nextKey++;
    const blank: DraftRecord = {
      key,
      include: true,
      source: "Added by hand",
      category: "oil",
      title: "",
      servicedOn: "",
      mileage: "",
      cost: "",
      shop: "",
      notes: "",
      parts: [],
    };
    setDrafts((list) => [blank, ...list]);
    setOpenKey(key);
  }

  function updateDraft(key: number, patch: Partial<DraftRecord>) {
    setError(null);
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function setAll(include: boolean) {
    setDrafts((list) => list.map((d) => ({ ...d, include: include && !d.duplicate })));
  }

  const kept = drafts.filter((d) => d.include);
  const highest = Math.max(0, ...kept.map((d) => Number(d.mileage.replace(/\D/g, "")) || 0));

  function showRow(key: number) {
    setOpenKey(key);
    requestAnimationFrame(() =>
      document.getElementById(`draft-${key}`)?.scrollIntoView({ block: "center" }),
    );
  }

  async function save() {
    setError(null);
    if (kept.length === 0) {
      setError({ text: "Tick at least one record to save, or add some above." });
      return;
    }
    if (kept.length > MAX_IMPORT_RECORDS) {
      setError({ text: `Save up to ${MAX_IMPORT_RECORDS} records at a time. Untick some and save the rest after.` });
      return;
    }
    const needsWork = kept.filter((d) => draftProblem(d, today ?? "9999-12-31"));
    if (needsWork.length > 0) {
      showRow(needsWork[0].key);
      setError({
        text:
          needsWork.length === 1
            ? "1 record needs a fix first, or untick it to leave it out."
            : `${needsWork.length} records need a fix first, or untick them to leave them out.`,
        rowKey: needsWork[0].key,
      });
      return;
    }

    setSaving("records");
    try {
      const result = await saveServiceHistory(vehicleId, JSON.stringify(kept));
      if ("error" in result) {
        setError({ text: result.error, rowKey: result.rowKey });
        if (result.rowKey) showRow(result.rowKey);
        setSaving(null);
        return;
      }

      // Each scanned photo goes on the first record read from it.
      setSaving("photos");
      const ids = new Map(result.saved.map((s) => [s.key, s.id]));
      let failedOn: string | null = null;
      for (const [photoKey, file] of photos.current) {
        const first = kept.find((d) => d.photoKey === photoKey);
        const id = first && ids.get(first.key);
        if (!id) continue;
        const fd = new FormData();
        fd.set("photo", file);
        const upload = await uploadPhoto(vehicleId, "record", id, fd).catch(() => ({ error: "failed" }));
        if (upload.error) failedOn ??= id;
      }

      localStorage.removeItem(storageKey);
      loaded.current = false;
      router.push(
        failedOn
          ? `/garage/${vehicleId}/service/${failedOn}/edit?photos=failed`
          : `/garage/${vehicleId}`,
      );
    } catch {
      setError({ text: "Those records didn't save. Your list is still here, so try again." });
      setSaving(null);
    }
  }

  const reading = jobs.some((j) => j.status === "reading");

  return (
    <div className="mt-6 space-y-5">
      <section
        aria-labelledby="add-heading"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles([...e.dataTransfer.files]);
        }}
        className={`${panelClass} transition-colors ${dragging ? "border-redline" : ""}`}
      >
        <h2 id="add-heading" className="font-display text-2xl leading-tight font-semibold">
          Add your records
        </h2>
        <p className="mt-1 text-sm text-steel">
          Photos of receipts or logbook pages, PDFs from a shop, and Excel or CSV files. Pick as many
          as you like.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="btn btn-primary cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-redline">
            <FileUp className="h-4 w-4" aria-hidden />
            Choose files
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => addFiles([...(e.target.files ?? [])])}
            />
          </label>
          <button type="button" onClick={addByHand} className="btn">
            <Plus className="h-4 w-4" aria-hidden />
            Add one by hand
          </button>
        </div>
        {!canScan && (
          <div className="mt-3">
            <ConfirmEmailNote action="scan photos and PDFs. Spreadsheets work now" />
          </div>
        )}
        <p className="field-hint">Photos and PDFs are read by Anthropic&apos;s AI.</p>
        {consent.dialog}

        <details className="mt-4 text-sm">
          <summary className="w-fit cursor-pointer text-steel hover:text-chalk">
            Moving from another app?
          </summary>
          <div className="mt-2 max-w-prose space-y-2 text-steel">
            <p>
              Look for Export or Backup in the app&apos;s settings, then choose the CSV or Excel file
              here. Drivvo, Fuelio, and LubeLogger can all export one, though some apps keep it
              behind a paid plan. For Google Sheets, use File, then Download.
            </p>
            <p>
              No export option? Take screenshots of the app&apos;s service history, or save it as a
              PDF, and add those. They&apos;re read the same way as a receipt.
            </p>
          </div>
        </details>

        <ul aria-live="polite" className="mt-4 space-y-1.5 empty:hidden">
          {jobs.map((job) => (
            <li key={job.key} className="text-sm">
              <div className="flex items-start gap-2">
                {job.status === "reading" && (
                  <LoaderCircle
                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-steel motion-reduce:animate-none"
                    aria-hidden
                  />
                )}
                {job.status === "failed" && (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-overdue" aria-hidden />
                )}
                <span className="min-w-0 break-words">
                  {job.name}:{" "}
                  <span
                    className={
                      job.status === "failed"
                        ? "text-overdue"
                        : job.status === "attention"
                          ? "text-due"
                          : job.status === "done"
                            ? "text-done"
                            : "text-steel"
                    }
                  >
                    {job.status === "reading" ? "Reading…" : job.message}
                  </span>
                </span>
              </div>
              {job.warning && <p className="mt-0.5 text-due">Couldn&apos;t read: {job.warning}</p>}
            </li>
          ))}
        </ul>
      </section>

      {sheet && (
        <SheetPanel
          open={sheet}
          canScan={canScan}
          reading={readingSheet}
          onChangeLayout={changeLayout}
          onChangeSheet={changeSheet}
          onReadWithAi={readSheetWithAi}
        />
      )}

      <section aria-labelledby="review-heading" className={panelClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="review-heading" className="font-display text-2xl leading-tight font-semibold">
            Check the list
          </h2>
          {drafts.length > 0 && (
            <p aria-live="polite" className="text-sm text-steel">
              {kept.length} of {plural(drafts.length, "record")} ticked
            </p>
          )}
        </div>
        {restored > 0 && drafts.length > 0 && (
          <p className="mt-1 text-sm text-steel">
            Picked up where you left off, with {plural(restored, "unsaved record")}.
          </p>
        )}

        {drafts.length === 0 ? (
          <p className="mt-4 border-t border-rule pt-4 text-sm text-steel">
            {reading
              ? "Records will show up here as they're read."
              : "Nothing here yet. Add a file above, and every service in it lands here for you to check."}
          </p>
        ) : (
          <>
            <div className="mt-3 flex gap-1 text-sm">
              <button type="button" onClick={() => setAll(true)} className="btn min-h-9 border-transparent px-2">
                Tick all
              </button>
              <button type="button" onClick={() => setAll(false)} className="btn min-h-9 border-transparent px-2">
                Untick all
              </button>
            </div>
            <ul className="mt-1 divide-y divide-rule border-y border-rule">
              {drafts.map((draft) => (
                <DraftRow
                  key={draft.key}
                  draft={draft}
                  today={today}
                  customTypes={customTypes}
                  open={openKey === draft.key}
                  onToggleOpen={() => setOpenKey(openKey === draft.key ? null : draft.key)}
                  onChange={(patch) => updateDraft(draft.key, patch)}
                  onRemove={() => setDrafts((list) => list.filter((d) => d.key !== draft.key))}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      {highest > currentMileage && (
        <p className="text-sm text-steel">
          The highest mileage here is{" "}
          <span className="readout text-chalk">{highest.toLocaleString("en-US")} mi</span>, so
          saving moves this car&apos;s odometer up from {currentMileage.toLocaleString("en-US")} mi.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-overdue">
          {error.text}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={save}
          disabled={saving !== null}
          aria-busy={saving !== null}
          className="btn btn-primary btn-lg sm:flex-1"
        >
          {saving === "records"
            ? "Saving…"
            : saving === "photos"
              ? "Adding photos…"
              : kept.length > 0
                ? `Save ${plural(kept.length, "record")}`
                : "Save records"}
        </button>
        <Link href={`/garage/${vehicleId}`} className="btn btn-lg">
          {skipLabel}
        </Link>
      </div>
    </div>
  );
}
