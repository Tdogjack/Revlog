// Pure reminder math, kept free of framework code so a future phone app
// or the nightly reminder job can reuse it.

import { vinModelYear } from "@/lib/vin-year";

export type ReminderStatus = "ok" | "due_soon" | "overdue";

export type ReminderInput = {
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneOn: string | null; // YYYY-MM-DD
  lastDoneMileage: number | null;
  // When it's never been done, the date the time interval counts from.
  startOn?: string | null; // YYYY-MM-DD
};

export type ReminderResult = {
  status: ReminderStatus;
  milesLeft: number | null;
  daysLeft: number | null;
  // Nothing to count from: no record of this service and no starting point.
  neverDone?: boolean;
};

export type ServiceDate = {
  vehicleId: string;
  category: string;
  servicedOn: string; // YYYY-MM-DD
  mileage: number | null;
};

// Service history is the source of truth: a reminder counts from the most
// recent record of its type, whatever order records were entered in. The
// reminder's own stored values are only the starting point when there's no
// matching record yet. If the newest record has no mileage, miles can't be
// tracked from it, so only the time interval applies until mileage is added.
export function withLastService<
  R extends ReminderInput & { vehicleId: string; serviceCategory: string | null },
>(reminder: R, services: ServiceDate[]): R {
  if (!reminder.serviceCategory) return reminder;
  const matching = services
    .filter((s) => s.vehicleId === reminder.vehicleId && s.category === reminder.serviceCategory)
    .sort((a, b) => b.servicedOn.localeCompare(a.servicedOn));
  if (matching.length === 0) return reminder;

  // Same-day records count as one visit, so take mileage from any of them.
  const latest = matching[0];
  const sameDayMileage = matching.find(
    (s) => s.servicedOn === latest.servicedOn && s.mileage != null,
  )?.mileage;
  return {
    ...reminder,
    lastDoneOn: latest.servicedOn,
    lastDoneMileage: sameDayMileage ?? null,
  };
}

// Where a never-logged time interval starts: the car's age. The build month
// is used when the owner entered it. Otherwise a VIN only gives the model
// year, not the build month, so this is January 1 of the model year (from
// the VIN when there is one, else the stored year). That's the latest
// plausible start, so a new car isn't flagged early. Cars newer than the
// reminder, or with no usable year, count from the day it was added.
export function carAgeStart(
  car: { year: number; vin: string | null; builtOn?: string | null },
  addedOn: Date,
): string {
  const added = addedOn.toISOString().slice(0, 10);
  if (car.builtOn) return car.builtOn < added ? car.builtOn : added;
  const year = vinModelYear(car.vin, car.year) ?? car.year;
  if (!Number.isInteger(year) || year < 1886) return added;
  const start = `${String(year).padStart(4, "0")}-01-01`;
  return start < added ? start : added;
}

// Gives a never-logged time-based reminder its car-age starting point.
// Run after withLastService, which sets lastDoneOn when there's a record.
export function withCarAgeStart<R extends ReminderInput & { createdAt: Date }>(
  reminder: R,
  car: { year: number; vin: string | null; builtOn?: string | null },
): R {
  if (reminder.lastDoneOn != null || reminder.intervalMonths == null) return reminder;
  return { ...reminder, startOn: carAgeStart(car, reminder.createdAt) };
}

const DUE_SOON_MILES = 500;
const DUE_SOON_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(isoDate: string, months: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export const STATUS_RANK: Record<ReminderStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };

function formatDays(days: number) {
  if (days >= 60) {
    const months = Math.round(days / 30);
    return `${months} months`;
  }
  return days === 1 ? "1 day" : `${days} days`;
}

// Plain-language summary, like "Due in 412 mi or 3 months" or "Overdue by 210 mi".
export function describeDue({ status, milesLeft, daysLeft, neverDone }: ReminderResult) {
  if (neverDone) return "Never done";
  const parts: string[] = [];
  if (status === "overdue") {
    if (milesLeft != null && milesLeft < 0)
      parts.push(`${(-milesLeft).toLocaleString("en-US")} mi`);
    if (daysLeft != null && daysLeft < 0) parts.push(formatDays(-daysLeft));
    return parts.length ? `Overdue by ${parts.join(" and ")}` : "Due now";
  }
  if (milesLeft != null) parts.push(`${milesLeft.toLocaleString("en-US")} mi`);
  if (daysLeft != null) parts.push(formatDays(daysLeft));
  return parts.length ? `Due in ${parts.join(" or ")}` : "Log the mileage to track this";
}

export type ReminderOptions = {
  // Due soon once this percent of the mileage interval is used, in place of
  // the 500-mile rule. Null or undefined keeps the default.
  dueSoonPercent?: number | null;
};

// Miles left at which a reminder turns "due soon".
function dueSoonMiles(intervalMiles: number, options: ReminderOptions) {
  const pct = options.dueSoonPercent;
  if (pct == null) return DUE_SOON_MILES;
  return Math.round((intervalMiles * (100 - pct)) / 100);
}

export function evaluateReminder(
  reminder: ReminderInput,
  currentMileage: number,
  today: Date = new Date(),
  options: ReminderOptions = {},
): ReminderResult {
  let milesLeft: number | null = null;
  let daysLeft: number | null = null;

  if (reminder.intervalMiles != null && reminder.lastDoneMileage != null) {
    milesLeft = reminder.lastDoneMileage + reminder.intervalMiles - currentMileage;
  }

  const timeFrom = reminder.lastDoneOn ?? reminder.startOn ?? null;
  if (reminder.intervalMonths != null && timeFrom != null) {
    const dueDate = addMonths(timeFrom, reminder.intervalMonths);
    daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
  }

  // A time-only reminder with nothing to count from is due now.
  if (milesLeft == null && daysLeft == null && timeFrom == null) {
    return { status: "overdue", milesLeft, daysLeft, neverDone: true };
  }

  // Whichever limit comes first wins, like "every 5,000 miles or 6 months".
  let status: ReminderStatus = "ok";
  if ((milesLeft != null && milesLeft <= 0) || (daysLeft != null && daysLeft <= 0)) {
    status = "overdue";
  } else if (
    (milesLeft != null &&
      reminder.intervalMiles != null &&
      milesLeft <= dueSoonMiles(reminder.intervalMiles, options)) ||
    (daysLeft != null && daysLeft <= DUE_SOON_DAYS)
  ) {
    status = "due_soon";
  }

  return { status, milesLeft, daysLeft };
}
