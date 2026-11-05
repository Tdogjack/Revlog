// Past service records waiting to be saved. Shared by the import page, the
// spreadsheet reader, and the server action that saves them.

import type { PartRow } from "@/lib/part-rows";
import { categoryLabel, SERVICE_CATEGORIES, type CustomType } from "@/lib/service-categories";

export const MAX_IMPORT_RECORDS = 1000;
export const MAX_NOTES = 2000;
const MAX_TITLE = 100;

// The fields of one record, all as text so they can be edited before saving.
export type DraftFields = {
  category: string;
  title: string;
  servicedOn: string; // YYYY-MM-DD, or blank until the user fills it in
  mileage: string;
  cost: string;
  shop: string;
  notes: string;
  parts: PartRow[];
};

export type DraftRecord = DraftFields & {
  key: number;
  include: boolean;
  // Where it came from, like a file name or "Added by hand".
  source: string;
  // Set when the row matches a record the car already has.
  duplicate?: boolean;
  // The scanned photo, attached to this source's first saved record.
  photoKey?: number;
};

// Keeps long descriptions: what doesn't fit in the title moves to the notes.
export function fitTitle(title: string, notes: string) {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= MAX_TITLE) return { title: clean, notes };
  const cut = clean.lastIndexOf(" ", MAX_TITLE - 1);
  const end = cut > 40 ? cut : MAX_TITLE - 1;
  return {
    title: clean.slice(0, end),
    notes: [clean, notes].filter(Boolean).join("\n"),
  };
}

// Checked in order, so a brake inspection is "inspection" and transmission
// oil is "transmission", not brakes or oil.
const CATEGORY_RULES: [string, RegExp][] = [
  ["inspection", /inspect|smog|emissions?\b|safety check|multi.?point|\bmot\b|diagnos/],
  ["rotation", /rotat/],
  ["alignment", /align/],
  ["brake-fluid", /brake\s+(fluid|flush|bleed)|bleed.*brakes?/],
  ["transmission", /transmission|\batf\b|\bcvt\b|gearbox/],
  ["differential", /diff\b|differential|transfer case/],
  ["coolant", /coolant|antifreeze|radiator (flush|fluid)/],
  ["cabin-filter", /cabin|pollen filter/],
  ["air-filter", /air filter|engine filter/],
  ["spark-plugs", /spark\s*plug|\bplugs\b/],
  ["battery", /batter(y|ies)/],
  ["wipers", /wiper/],
  ["brakes", /brake|rotors?\b|calipers?\b|\bpads?\b/],
  ["tires", /\btires?\b|\btyres?\b|wheel balanc|\bbalance\b/],
  ["oil", /\boil\b|\blube\b|\blof\b/],
  ["filters", /filter/],
  ["fluids", /fluid|power steering|washer/],
  [
    "repair",
    /repair|replac|fix|recall|install|alternator|starter|water pump|timing|belt|hose|sensor|gasket|strut|shock|suspension|exhaust|muffler/,
  ],
];

// Picks the service type from free text, like a spreadsheet's description.
export function guessCategory(text: string, customTypes: CustomType[] = []) {
  const t = text.toLowerCase();
  const custom = customTypes.find((c) => t.includes(c.name.toLowerCase()));
  if (custom) return custom.id;
  const builtIn = SERVICE_CATEGORIES.find((c) => t.trim() === c.label.toLowerCase());
  if (builtIn) return builtIn.value;
  return CATEGORY_RULES.find(([, rule]) => rule.test(t))?.[0] ?? "other";
}

export type DateOrder = "mdy" | "dmy";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isoDate(year: number, month: number, day: number) {
  const fullYear =
    year >= 100 ? year : year + (year <= (new Date().getFullYear() + 1) % 100 ? 2000 : 1900);
  const d = new Date(Date.UTC(fullYear, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return "";
  if (fullYear < 1900) return "";
  return d.toISOString().slice(0, 10);
}

// Spreadsheets store dates as days since the end of 1899.
const SERIAL_EPOCH = Date.UTC(1899, 11, 30);

// Reads a date in any common written form. Blank means it couldn't be read.
export function parseDate(value: unknown, order: DateOrder = "mdy"): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    if (value < 10_000 || value > 80_000) return "";
    return new Date(SERIAL_EPOCH + Math.floor(value) * 86_400_000).toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/);
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3]);

  const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?!\d)/);
  if (numeric) {
    const [a, b, year] = [+numeric[1], +numeric[2], +numeric[3]];
    const dayFirst = a > 12 || (order === "dmy" && b <= 12);
    return dayFirst ? isoDate(year, b, a) : isoDate(year, a, b);
  }

  const named =
    text.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/) ??
    text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (named) {
    const [first, second] = [named[1], named[2]];
    const monthFirst = /^[a-z]/.test(first);
    const month = MONTHS.indexOf((monthFirst ? first : second).slice(0, 3)) + 1;
    if (month > 0) return isoDate(+named[3], month, +(monthFirst ? second : first));
  }

  // A month and year alone counts as the 1st of that month.
  const monthYear = text.match(/\b([a-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (monthYear) {
    const month = MONTHS.indexOf(monthYear[1].slice(0, 3)) + 1;
    if (month > 0) return isoDate(+monthYear[2], month, 1);
  }
  return "";
}

// Day-first dates give themselves away with a first number over 12.
export function detectDateOrder(values: unknown[]): DateOrder {
  for (const value of values) {
    const m = String(value ?? "").trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) return "dmy";
    if (+m[2] > 12) return "mdy";
  }
  return "mdy";
}

// True when no date in the list can tell month-first from day-first.
export function dateOrderIsAmbiguous(values: unknown[]) {
  let numeric = false;
  for (const value of values) {
    const m = String(value ?? "").trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    numeric = true;
    if (+m[1] > 12 || +m[2] > 12) return false;
  }
  return numeric;
}

// "1.234,50", "$1,234.50", and "45 EUR" are all money. Anything without a
// number in it, like "No charge", reads as blank.
export function parseMoney(value: unknown): string {
  if (typeof value === "number") return value >= 0 ? value.toFixed(2) : "";
  const text = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!/\d/.test(text) || text.startsWith("-")) return "";
  const decimal = text.match(/[.,](\d{1,2})$/);
  const whole = (decimal ? text.slice(0, decimal.index) : text).replace(/\D/g, "");
  const amount = Number(`${whole || "0"}.${decimal?.[1] ?? "0"}`);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
}

// "48,210 mi", "48.210", and "48k" are all 48,210-ish odometer readings.
export function parseMileage(value: unknown, unit: "mi" | "km" = "mi"): string {
  const toMiles = (n: number) => Math.round(unit === "km" ? n * 0.621371 : n).toString();
  if (typeof value === "number") return value > 0 ? toMiles(value) : "";
  const text = String(value ?? "").trim().toLowerCase();
  const m = text.match(/\d[\d,.\s]*/);
  if (!m) return "";
  const digits = m[0].trim();
  if (/k\b/.test(text.slice(m.index! + m[0].length, m.index! + m[0].length + 2))) {
    return toMiles(Number(digits.replace(",", ".")) * 1000);
  }
  // A trailing .5 is a decimal; separators before three digits group thousands.
  const whole = digits.replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "");
  return whole && Number(whole) > 0 ? toMiles(Number(whole)) : "";
}

// What must change before this row can be saved. Blank means it's ready.
export function draftProblem(draft: DraftFields, today: string): string | null {
  if (!draft.servicedOn) return "Add the date";
  if (draft.servicedOn > today) return "Date is in the future";
  if (draft.mileage && !/^\d[\d,\s]*$/.test(draft.mileage)) return "Mileage needs to be a number";
  if (draft.cost && !/^\$?\s*\d[\d,]*(\.\d+)?$/.test(draft.cost.trim())) {
    return "Cost needs to be a number";
  }
  if (draft.notes.length > MAX_NOTES) return `Notes are over ${MAX_NOTES} characters`;
  if (draft.title.length > MAX_TITLE) return `Description is over ${MAX_TITLE} characters`;
  return null;
}

// Two rows match when they're the same service on the same day.
export function recordMatchKey(
  r: { servicedOn: string; title: string; category: string },
  customTypes: CustomType[],
) {
  const name = r.title.trim() || categoryLabel(r.category, customTypes);
  return `${r.servicedOn}|${name.toLowerCase()}`;
}
