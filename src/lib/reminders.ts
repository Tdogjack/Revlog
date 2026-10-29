// Pure reminder math, kept free of framework code so a future phone app
// or the nightly reminder job can reuse it.

export type ReminderStatus = "ok" | "due_soon" | "overdue";

export type ReminderInput = {
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneOn: string | null; // YYYY-MM-DD
  lastDoneMileage: number | null;
};

export type ReminderResult = {
  status: ReminderStatus;
  milesLeft: number | null;
  daysLeft: number | null;
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
export function describeDue({ status, milesLeft, daysLeft }: ReminderResult) {
  const parts: string[] = [];
  if (status === "overdue") {
    if (milesLeft != null && milesLeft < 0)
      parts.push(`${(-milesLeft).toLocaleString("en-US")} mi`);
    if (daysLeft != null && daysLeft < 0) parts.push(formatDays(-daysLeft));
    return parts.length ? `Overdue by ${parts.join(" and ")}` : "Due now";
  }
  if (milesLeft != null) parts.push(`${milesLeft.toLocaleString("en-US")} mi`);
  if (daysLeft != null) parts.push(formatDays(daysLeft));
  return `Due in ${parts.join(" or ")}`;
}

export function evaluateReminder(
  reminder: ReminderInput,
  currentMileage: number,
  today: Date = new Date(),
): ReminderResult {
  let milesLeft: number | null = null;
  let daysLeft: number | null = null;

  if (reminder.intervalMiles != null && reminder.lastDoneMileage != null) {
    milesLeft = reminder.lastDoneMileage + reminder.intervalMiles - currentMileage;
  }

  if (reminder.intervalMonths != null && reminder.lastDoneOn != null) {
    const dueDate = addMonths(reminder.lastDoneOn, reminder.intervalMonths);
    daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
  }

  // Whichever limit comes first wins, like "every 5,000 miles or 6 months".
  let status: ReminderStatus = "ok";
  if ((milesLeft != null && milesLeft <= 0) || (daysLeft != null && daysLeft <= 0)) {
    status = "overdue";
  } else if (
    (milesLeft != null && milesLeft <= DUE_SOON_MILES) ||
    (daysLeft != null && daysLeft <= DUE_SOON_DAYS)
  ) {
    status = "due_soon";
  }

  return { status, milesLeft, daysLeft };
}
