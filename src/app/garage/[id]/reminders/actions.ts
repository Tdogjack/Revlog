"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  addReminderFromFields,
  editReminderFromFields,
  readReminderFields,
} from "@/lib/reminder-forms";
import { deleteReminder, markReminderNeverDone } from "@/lib/reminder-store";
import { localDateOrToday, mileageInput, setVehicleMileage } from "@/lib/vehicles";

export type ReminderFormState = { error?: string; values?: Record<string, string> } | undefined;

export async function addReminder(
  vehicleId: string,
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const user = await requireUser();
  const raw = readReminderFields((k) => formData.get(k));
  const error = await addReminderFromFields(user.id, vehicleId, raw);
  if (error) return { error, values: raw };
  redirect(`/garage/${vehicleId}/reminders`);
}

export async function editReminder(
  vehicleId: string,
  reminderId: string,
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const user = await requireUser();
  const raw = readReminderFields((k) => formData.get(k));
  const error = await editReminderFromFields(user.id, vehicleId, reminderId, raw);
  if (error) return { error, values: raw };
  redirect(`/garage/${vehicleId}/reminders`);
}

// Logs the service on the chosen date, which resets the reminder.
export async function removeReminder(vehicleId: string, reminderId: string) {
  const user = await requireUser();
  await deleteReminder(user.id, reminderId);
  revalidatePath(`/garage/${vehicleId}`, "layout");
}

export async function markNeverDone(vehicleId: string, reminderId: string) {
  const user = await requireUser();
  await markReminderNeverDone(user.id, vehicleId, reminderId);
  revalidatePath(`/garage/${vehicleId}`, "layout");
  revalidatePath("/garage");
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
  await setVehicleMileage(
    user.id,
    vehicleId,
    parsed.data,
    localDateOrToday(formData.get("readOn")),
  );
  revalidatePath(`/garage/${vehicleId}`, "layout");
  return undefined;
}
