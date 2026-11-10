// Reads a service log from a CSV or Excel file. Nobody's spreadsheet looks the
// same, so columns are matched by what their headings mean, and any column
// without a home goes into the notes so nothing is lost. Runs in the browser:
// the file itself is never uploaded.

import {
  dateOrderIsAmbiguous,
  detectDateOrder,
  fitTitle,
  guessCategory,
  parseDate,
  parseMileage,
  parseMoney,
  type DateOrder,
  type DraftFields,
} from "@/lib/history-draft";
import { categoryLabel, type CustomType } from "@/lib/service-categories";

export type Cell = string | number | boolean | Date | null;
export type Sheet = { name: string; rows: Cell[][] };

export type ColumnField =
  | "date"
  | "title"
  | "type"
  | "mileage"
  | "cost"
  | "shop"
  | "notes"
  | "parts"
  | "skip";

export const COLUMN_FIELDS: { value: ColumnField; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "title", label: "Description" },
  { value: "type", label: "Service type" },
  { value: "mileage", label: "Mileage" },
  { value: "cost", label: "Cost" },
  { value: "shop", label: "Shop" },
  { value: "notes", label: "Notes" },
  { value: "parts", label: "Parts" },
  { value: "skip", label: "Leave out" },
];

export type Layout = {
  headerRow: number; // -1 when the sheet has no headings
  columns: ColumnField[];
  dateOrder: DateOrder;
  unit: "mi" | "km";
  // Whether this sheet's rows go on the list.
  include: boolean;
  // Set when the sheet's name says what every row is, like "Oil Change Log".
  service: string | null;
  // Set once AI has read the sheet, with how many services it found.
  aiCount?: number;
};

export function columnName(sheet: Sheet, layout: Pick<Layout, "headerRow">, index: number) {
  const heading = layout.headerRow >= 0 ? cellText(sheet.rows[layout.headerRow]?.[index]) : "";
  return heading || `Column ${String.fromCharCode(65 + (index % 26))}`;
}

// Formula errors like #VALUE! are the spreadsheet's problem, not data.
const FORMULA_ERROR = /^#(VALUE!|REF!|N\/A|DIV\/0!|NAME\?|NULL!|NUM!)$/;

export function cellText(cell: Cell | undefined): string {
  if (cell == null) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  const text = String(cell).trim();
  return FORMULA_ERROR.test(text) ? "" : text;
}

// Parsing

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const counts = [",", ";", "\t", "|"].map((d) => [d, sample.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

export function parseDelimited(text: string): Cell[][] {
  const delimiter = detectDelimiter(text);
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length > 0) rows.push([...row, cell]);
  return rows;
}

// App backups often pack several tables into one file, each under a line
// like "## Costs". Each table becomes its own sheet.
export function splitSections(name: string, rows: Cell[][]): Sheet[] {
  const isMarker = (row: Cell[]) => {
    const filled = row.filter((c) => cellText(c));
    return filled.length === 1 && /^#{1,3}\s*\S/.test(cellText(filled[0]));
  };
  if (!rows.some(isMarker)) return [{ name, rows }];

  const sheets: Sheet[] = [];
  let current: Sheet | null = null;
  for (const row of rows) {
    if (isMarker(row)) {
      current = {
        name: cellText(row.find((c) => cellText(c))).replace(/^#+\s*/, ""),
        rows: [],
      };
      sheets.push(current);
    } else if (current) {
      current.rows.push(row);
    }
  }
  return sheets.filter((s) => s.rows.length > 1);
}

export function decodeText(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export const SHEET_ACCEPT = ".csv,.tsv,.txt,.xlsx,text/csv";

// The Excel reader is sizable, so it only loads when an Excel file shows up.
export async function readSheets(file: File): Promise<Sheet[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const sheets = await readXlsxFile(file);
    return sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }));
  }
  if (/\.(xls|numbers|ods)$/i.test(file.name)) {
    throw new Error("Save it as .xlsx or .csv first, then add it here.");
  }
  return splitSections(file.name, parseDelimited(decodeText(await file.arrayBuffer())));
}

// Working out the layout

const words = (heading: string) =>
  heading
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, " ")
    .trim();

const NOT_THIS_VISIT = /\b(next|due|since|remind\w*|interval|repeat|created|modified|updated|expir\w*)\b/;
const JUNK = /\b(id|uuid|guid|flag|read|is template|template|is income|unique|index|row|sync|deleted|unit|units|currency|vehicle|car)\b/;

export function fieldForHeading(heading: string): ColumnField | null {
  const h = words(heading);
  if (!h) return null;
  if (JUNK.test(h) || NOT_THIS_VISIT.test(h)) return "skip";
  if (/\b(dates?|when|day|serviced on|done on|completed)\b/.test(h)) return "date";
  if (/\b(miles|mileage|odometer|odo|kilometers|kilometres|kilometrage|km|kms|mi)\b/.test(h)) {
    return "mileage";
  }
  if (/\b(notes?|comments?|remarks?|memo|observations?)\b/.test(h)) return "notes";
  if (/\b(title|description|desc)\b/.test(h)) return "title";
  if (/^(service |expense |cost |maintenance |repair )?(type|category|kind|tags?)$/.test(h)) {
    return "type";
  }
  if (/\b(cost|price|total|amount|paid|charge|expense|\$)\b/.test(h)) return "cost";
  if (/\b(parts?|products?|materials?)\b/.test(h) && !/\bcost\b/.test(h)) return "parts";
  if (/\b(shop|garage|mechanic|vendor|dealer|dealership|place|location|where|provider|workshop|station|center|centre|business|performed by|done by)\b/.test(h)) {
    return "shop";
  }
  if (/\b(service|services|work|item|task|job|what|maintenance|repair|repairs|details)\b/.test(h)) {
    return "title";
  }
  return null;
}

const FIELD_WEIGHT: Partial<Record<ColumnField, number>> = {
  date: 3,
  title: 3,
  type: 2,
  mileage: 2,
  cost: 2,
  shop: 1,
  notes: 1,
  parts: 1,
};

// A title or a car's name above the table is common, so look a little way down.
function findHeaderRow(rows: Cell[][]) {
  let best = { row: -1, score: 0 };
  rows.slice(0, 15).forEach((row, i) => {
    const score = row.reduce<number>((sum, cell) => {
      if (typeof cell !== "string") return sum;
      return sum + (FIELD_WEIGHT[fieldForHeading(cell) ?? "skip"] ?? 0);
    }, 0);
    if (score > best.score) best = { row: i, score };
  });
  return best;
}

function looksLikeDate(cell: Cell) {
  if (cell instanceof Date) return true;
  return typeof cell === "string" && parseDate(cell) !== "";
}

// For columns the heading didn't explain, go by what's in them.
function fieldFromContent(values: Cell[]): ColumnField | null {
  const filled = values.filter((v) => cellText(v));
  if (filled.length === 0) return null;
  const share = (test: (c: Cell) => boolean) => filled.filter(test).length / filled.length;
  if (share(looksLikeDate) >= 0.7) return "date";
  if (share((c) => /^\s*[$£€]/.test(cellText(c))) >= 0.7) return "cost";
  if (share((c) => /^[\d,.\s]{4,}(mi|km|miles)?$/i.test(cellText(c))) >= 0.7) return "mileage";
  return null;
}

const isWordy = (values: Cell[]) => {
  const filled = values.filter((v) => cellText(v));
  return filled.length > 0 && filled.every((v) => /[a-z]{3}/i.test(cellText(v)));
};

// "Oil Change Log" says what every row is, so it needs no description column.
function serviceFromName(name: string) {
  const subject = words(name)
    .replace(/\b(log|logs|history|records?|tracker|sheet)\b/g, "")
    .trim();
  const category = subject ? guessCategory(subject) : "other";
  return category === "other" ? null : category;
}

export function sheetHasRows(sheet: Sheet, layout: Pick<Layout, "headerRow">) {
  return sheet.rows.slice(layout.headerRow + 1).some((row) => row.some((c) => cellText(c)));
}

const FUEL_SHEET = /\b(fuel|fuell?ing|refuel\w*|gas|fill ?ups?)\b/;

export function guessLayout(sheet: Sheet): Layout {
  const { row: headerRow } = findHeaderRow(sheet.rows);
  const data = sheet.rows.slice(headerRow + 1);
  const width = Math.max(0, ...sheet.rows.slice(0, 200).map((r) => r.length));
  const headings = headerRow >= 0 ? sheet.rows[headerRow] : [];

  const columns: ColumnField[] = [];
  for (let i = 0; i < width; i++) {
    const heading = cellText(headings[i]);
    const values = data.map((r) => r[i]);
    const empty = !values.some((v) => cellText(v));
    let field = empty ? "skip" : fieldForHeading(heading);
    if (!field) field = fieldFromContent(values);
    // Only one column can be the date; extras are often "next due" and the like.
    if (field === "date" && columns.includes("date")) field = "notes";
    if (field === "mileage" && columns.includes("mileage")) field = "notes";
    columns.push(field ?? "notes");
  }

  // No heading named the work, and the sheet's name doesn't either, so use a
  // Part column if there is one, or else the first column of words.
  const named = columns.includes("title") || columns.includes("type");
  const service = named ? null : serviceFromName(sheet.name);
  if (!named && !service) {
    const partAt = columns.indexOf("parts");
    const wordy = columns.findIndex(
      (f, i) =>
        f === "notes" &&
        fieldForHeading(cellText(headings[i])) !== "notes" &&
        isWordy(data.map((r) => r[i])),
    );
    if (partAt >= 0 || wordy >= 0) columns[partAt >= 0 ? partAt : wordy] = "title";
  }

  // With a "Total", labor and parts columns would count twice.
  const totalAt = columns.findIndex(
    (f, i) => f === "cost" && /\btotal\b/.test(words(cellText(headings[i]))),
  );
  if (totalAt >= 0) {
    columns.forEach((f, i) => {
      if (f === "cost" && i !== totalAt) columns[i] = "notes";
    });
  }

  const dates = data.map((r) => r[columns.indexOf("date")]);
  const mileageAt = columns.indexOf("mileage");
  const kmHeading = mileageAt >= 0 && /\b(km|kms|kilomet\w*)\b/.test(words(cellText(headings[mileageAt])));
  const kmCells = data.some((r) => /\d\s*km\b/i.test(cellText(r[mileageAt])));

  const layout: Layout = {
    headerRow,
    columns,
    dateOrder: detectDateOrder(dates),
    unit: kmHeading || kmCells ? "km" : "mi",
    include: false,
    service,
  };
  const isFuel = FUEL_SHEET.test(words(sheet.name));
  return { ...layout, include: !isFuel && layoutIsComplete(layout) && sheetHasRows(sheet, layout) };
}

export function layoutIsComplete(layout: Layout) {
  const has = (f: ColumnField) => layout.columns.includes(f);
  return has("date") && (has("title") || has("type") || !!layout.service);
}

export function layoutNeedsDateOrder(sheet: Sheet, layout: Layout) {
  const at = layout.columns.indexOf("date");
  if (at < 0) return false;
  return dateOrderIsAmbiguous(sheet.rows.slice(layout.headerRow + 1).map((r) => r[at]));
}

// Turning rows into records

const FUEL_ENTRY = /^(fuel|refuel(l?ing)?|fill[- ]?up|gas|gasoline|diesel|petrol)$/i;
const TOTAL_ROW = /^(grand )?totals?:?$/i;
const NOTHING_NOTED = /^(none|n\/?a|-+)$/i;

export type SheetDrafts = { drafts: DraftFields[]; skippedFuel: number };

export function sheetToDrafts(
  sheet: Sheet,
  layout: Layout,
  customTypes: CustomType[],
): SheetDrafts {
  const { columns, dateOrder, unit } = layout;
  const drafts: DraftFields[] = [];
  let skippedFuel = 0;
  // A visit's later lines often leave the date, mileage, and shop blank.
  let visit = { servicedOn: "", mileage: "", shop: "" };

  for (const row of sheet.rows.slice(layout.headerRow + 1)) {
    const at = (field: ColumnField) => columns.flatMap((f, i) => (f === field ? [i] : []));
    const texts = (field: ColumnField) => at(field).map((i) => cellText(row[i])).filter(Boolean);
    const first = (field: ColumnField) => {
      const i = at(field)[0];
      return i === undefined ? null : (row[i] ?? null);
    };

    const type = texts("type").join(" ");
    const description = texts("title").join(", ");
    const label = description || type;
    if (TOTAL_ROW.test(label) || TOTAL_ROW.test(cellText(first("date")))) continue;
    if (FUEL_ENTRY.test(type) || FUEL_ENTRY.test(description)) {
      skippedFuel++;
      continue;
    }

    const rawDate = first("date");
    const rawMileage = first("mileage");
    const hasCost = at("cost").some((i) => cellText(row[i]));
    const noteLines = columns.flatMap((f, i) => {
      if (f !== "notes" || !cellText(row[i]) || NOTHING_NOTED.test(cellText(row[i]))) return [];
      const isPlainNotes = fieldForHeading(cellText(sheet.rows[layout.headerRow]?.[i])) === "notes";
      return [isPlainNotes ? cellText(row[i]) : `${columnName(sheet, layout, i)}: ${cellText(row[i])}`];
    });
    if (!label && !noteLines.length && !cellText(rawDate) && !hasCost) continue;

    const servicedOn = parseDate(rawDate, dateOrder);
    const mileage = parseMileage(rawMileage, unit);
    const shop = texts("shop").join(", ");
    const continues = !cellText(rawDate) && !cellText(rawMileage) && !shop;
    if (!continues) visit = { servicedOn, mileage, shop };

    const cost = at("cost").reduce((sum, i) => sum + (Number(parseMoney(row[i])) || 0), 0);
    const guessed = guessCategory(`${type} ${description}`.trim(), customTypes);
    const category = guessed === "other" && layout.service ? layout.service : guessed;
    const fitted = fitTitle(description || type || categoryLabel(category, customTypes), "");
    const unreadDate = cellText(rawDate) && !servicedOn ? `Date in file: ${cellText(rawDate)}` : "";

    drafts.push({
      category,
      title: fitted.title,
      servicedOn: continues ? visit.servicedOn : servicedOn,
      mileage: continues ? visit.mileage : mileage,
      cost: hasCost ? cost.toFixed(2) : "",
      shop: continues ? visit.shop : shop,
      notes: [fitted.notes, ...noteLines, unreadDate].filter(Boolean).join("\n"),
      parts: texts("parts")
        .flatMap((p) => p.split(/[,;\n]/))
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 50)
        .map((name) => ({ name: name.slice(0, 120), url: "", quantity: "1", price: "", trackPrice: false })),
    });
  }
  return { drafts, skippedFuel };
}

// A sheet as plain text, for the AI reader to work through odd layouts.
export function sheetAsText(sheet: Sheet) {
  return sheet.rows.map((row) => row.map(cellText).join("\t").trimEnd()).join("\n").trim();
}
