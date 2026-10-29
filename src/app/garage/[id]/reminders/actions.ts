"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createReminder,
  deleteReminder,
  getReminder,
  markDoneInput,
  reminderInput,
  setReminderStart,
} from "@/lib/reminder-store";
import { categoryLabel } from "@/lib/service-categories";
import { createServiceRecord } from "@/lib/service-records";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";
import { getVehicle, mileageInput, setVehicleMileage } from "@/lib/vehicles";

export type ReminderFormState = { error?: string; values?: Record<string, string> } | undefined;

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

export async function addReminder(
  vehicleId: string,
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const parsed = reminderInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const type = await resolveServiceType(user.id, raw.category, raw.newType);
  if ("error" in type) return { error: type.error, values: raw };

  const label = categoryLabel(type.key, await listServiceTypes(user.id));
  const r = parsed.data;
  const reminder = await createReminder(user.id, vehicleId, {
    task: r.task || label,
    serviceCategory: type.key,
    intervalMiles: r.intervalMiles,
    intervalMonths: r.intervalMonths,
    startOn: r.today,
  });
  if (!reminder) return { error: "That car wasn't found.", values: raw };

  // A known last-done date goes into service history, which the reminder counts from.
  if (r.lastDoneOn) {
    await createServiceRecord(user.id, vehicleId, {
      category: type.key,
      title: label,
      servicedOn: r.lastDoneOn,
      mileage: r.lastDoneMileage,
      cost: null,
      shop: null,
      notes: null,
    });
  }

  redirect(`/garage/${vehicleId}`);
}

export type MarkDoneState = { error?: string; ok?: boolean } | undefined;

// Logs the service on the chosen date, which resets the reminder.
export async function completeReminder(
  vehicleId: string,
  reminderId: string,
  _prev: MarkDoneState,
  formData: FormData,
): Promise<MarkDoneState> {
  const user = await requireUser();
  const parsed = markDoneInput.safeParse({
    doneOn: formData.get("doneOn") ?? "",
    mileage: formData.get("mileage") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [reminder, car] = await Promise.all([
    getReminder(user.id, vehicleId, reminderId),
    getVehicle(user.id, vehicleId),
  ]);
  if (!reminder || !car) return { error: "That reminder wasn't found." };

  const { doneOn, mileage } = parsed.data;
  if (reminder.serviceCategory) {
    await createServiceRecord(user.id, vehicleId, {
      category: reminder.serviceCategory,
      title: reminder.task,
      servicedOn: doneOn,
      mileage: mileage ?? null,
      cost: null,
      shop: null,
      notes: null,
    });
  } else {
    await setReminderStart(user.id, reminderId, doneOn, mileage ?? car.currentMileage);
  }

  revalidatePath(`/garage/${vehicleId}`);
  return { ok: true };
}

export async function removeReminder(vehicleId: string, reminderId: string) {
  const user = await requireUser();
  await deleteReminder(user.id, reminderId);
  revalidatePath(`/garage/${vehicleId}`);
}

export type MileageState = { error?: string } | undefined;

export async function updateMileage(
  vehicleId: string,
  _prev: MileageState,
  formData: FormData,
): Promise<MileageState> {
  const user = await requireUser();
  const parsed = mileageInput.safeParse(formData.get("currentMileage"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await setVehicleMileage(user.id, vehicleId, parsed.data);
  revalidatePath(`/garage/${vehicleId}`);
  return undefined;
}
