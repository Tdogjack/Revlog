import "server-only";
import { createReminder, reminderInput, updateReminder } from "@/lib/reminder-store";
import { categoryLabel } from "@/lib/service-categories";
import { createServiceRecord } from "@/lib/service-records";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";

const FIELDS = [
  "category",
  "newType",
  "task",
  "intervalMiles",
  "intervalMonths",
  "lastDoneOn",
  "lastDoneMileage",
  "today",
];

export const readReminderFields = (read: (key: string) => unknown) =>
  Object.fromEntries(FIELDS.map((k) => [k, String(read(k) ?? "")]));

async function parseFields(userId: string, raw: Record<string, string>) {
  const parsed = reminderInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const type = await resolveServiceType(userId, raw.category, raw.newType);
  if ("error" in type) return { error: type.error };

  const label = categoryLabel(type.key, await listServiceTypes(userId));
  const r = parsed.data;
  return {
    input: {
      task: r.task || label,
      serviceCategory: type.key,
      intervalMiles: r.intervalMiles,
      intervalMonths: r.intervalMonths,
    },
    label,
    lastDoneOn: r.lastDoneOn,
    lastDoneMileage: r.lastDoneMileage,
  };
}

// Returns an error message, or null once saved.
export async function addReminderFromFields(
  userId: string,
  vehicleId: string,
  raw: Record<string, string>,
) {
  const form = await parseFields(userId, raw);
  if ("error" in form) return form.error;

  const reminder = await createReminder(userId, vehicleId, form.input);
  if (!reminder) return "That car wasn't found.";

  // A known last-done date goes into service history, which the reminder counts from.
  if (form.lastDoneOn) {
    await createServiceRecord(userId, vehicleId, {
      category: form.input.serviceCategory,
      title: form.label,
      servicedOn: form.lastDoneOn,
      mileage: form.lastDoneMileage,
      cost: null,
      shop: null,
      notes: null,
    });
  }
  return null;
}

// Last-done comes from service history, so editing only changes the type,
// name, and intervals. Returns an error message, or null once saved.
export async function editReminderFromFields(
  userId: string,
  vehicleId: string,
  reminderId: string,
  raw: Record<string, string>,
) {
  const form = await parseFields(userId, raw);
  if ("error" in form) return form.error;
  const updated = await updateReminder(userId, vehicleId, reminderId, form.input);
  return updated ? null : "That reminder wasn't found.";
}
