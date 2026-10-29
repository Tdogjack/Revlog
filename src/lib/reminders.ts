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

const DUE_SOON_MILES = 500;
const DUE_SOON_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(isoDate: string, months: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
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
