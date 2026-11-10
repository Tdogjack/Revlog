import "server-only";
import { MAX_IMPORT_RECORDS, type DraftFields } from "@/lib/history-draft";
import { scanHistoryText, type HistoryScanResult } from "@/lib/history-scan";
import { scanBlocked } from "@/lib/scan-gate";
import type { CustomType } from "@/lib/service-categories";
import {
  decodeText,
  guessLayout,
  parseDelimited,
  sheetAsText,
  sheetToDrafts,
  splitSections,
  type Cell,
  type Sheet,
} from "@/lib/spreadsheet";

const MAX_SHEET_BYTES = 2 * 1024 * 1024;

async function readSheets(file: File): Promise<Sheet[]> {
  const buffer = await file.arrayBuffer();
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file/node");
    const sheets = await readXlsxFile(Buffer.from(buffer));
    return sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }));
  }
  return splitSections(file.name, parseDelimited(decodeText(buffer)));
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The phone app's spreadsheet import. The website matches columns in the
// browser and lets the owner correct them; here the columns are matched for
// them, and a sheet that can't be followed goes to the AI reader instead.
export async function readHistorySheet(
  userId: string,
  file: File,
  customTypes: CustomType[],
): Promise<HistoryScanResult> {
  if (file.size > MAX_SHEET_BYTES) {
    return { error: "That file is over 2 MB. Split it into smaller files and add those." };
  }
  if (/\.(xls|numbers|ods)$/i.test(file.name)) {
    return { error: "Save it as .xlsx or .csv first, then add it here." };
  }

  let sheets: Sheet[];
  try {
    sheets = await readSheets(file);
  } catch {
    return { error: "That file couldn't be opened. Save it as .xlsx or .csv and try again." };
  }
  if (sheets.length === 0) return { error: "That file has no rows to read." };

  const entries: DraftFields[] = [];
  const unmatched: Sheet[] = [];
  let skippedFuel = 0;
  for (const sheet of sheets) {
    const layout = guessLayout(sheet);
    if (!layout.include) {
      unmatched.push(sheet);
      continue;
    }
    const found = sheetToDrafts(sheet, layout, customTypes);
    entries.push(...found.drafts);
    skippedFuel += found.skippedFuel;
  }

  if (entries.length === 0) {
    // Nothing lined up, so let the AI reader try, if this account allows it.
    const blocked = await scanBlocked(userId);
    if (blocked) {
      return {
        error: `The columns in that file couldn't be matched. Each row needs a date and a service. ${blocked}`,
      };
    }
    return scanHistoryText(userId, unmatched.map(sheetAsText).join("\n\n"), customTypes);
  }

  const notes = [
    entries.length > MAX_IMPORT_RECORDS &&
      `Only the first ${MAX_IMPORT_RECORDS.toLocaleString("en-US")} rows were read.`,
    skippedFuel > 0 && `Skipped ${plural(skippedFuel, "fuel fill-up")}.`,
  ].filter(Boolean);
  return {
    data: {
      entries: entries.slice(0, MAX_IMPORT_RECORDS),
      unreadable: notes.length > 0 ? notes.join(" ") : null,
    },
  };
}
