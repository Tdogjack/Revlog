"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import { editService, logService, readServiceFields } from "@/lib/service-log";
import { deleteServiceRecord } from "@/lib/service-records";
import { scanReceipt, type ScanResult } from "@/lib/receipt-scan";
import { scanBlocked } from "@/lib/scan-gate";
import { listServiceTypes } from "@/lib/service-types";

export type ServiceFormState =
  { error?: string; values?: Record<string, string>; savedId?: string } | undefined;

export async function addServiceRecord(
  vehicleId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  return saveLog(vehicleId, null, formData);
}

// "Mark done" on a reminder logs the service through the same form.
export async function addReminderService(
  vehicleId: string,
  reminderId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  return saveLog(vehicleId, reminderId, formData);
}

async function saveLog(
  vehicleId: string,
  reminderId: string | null,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const raw = readServiceFields((k) => formData.get(k));
  const result = await logService(
    user.id,
    vehicleId,
    reminderId,
    raw,
    formData.get("extraServices"),
  );
  if ("error" in result) return { error: result.error, values: raw };

  // With photos waiting, the form uploads them to the new record, then leaves.
  if (formData.get("stay")) return { savedId: result.id };
  redirect(`/garage/${vehicleId}/service`);
}

export async function editServiceRecord(
  vehicleId: string,
  recordId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const raw = readServiceFields((k) => formData.get(k));
  const error = await editService(user.id, vehicleId, recordId, raw);
  if (error) return { error, values: raw };
  redirect(`/garage/${vehicleId}/service`);
}

// Reads a receipt photo into form values. Nothing is saved here.
export async function scanServiceReceipt(formData: FormData): Promise<ScanResult> {
  const user = await requireUser();
  const blocked = await scanBlocked(user.id);
  if (blocked) return { error: blocked };
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a receipt photo." };
  return scanReceipt(user.id, photo, await listServiceTypes(user.id));
}

export async function removeServiceRecord(vehicleId: string, recordId: string) {
  const user = await requireUser();
  const paths = await photoPathsFor(user.id, { kind: "record", id: recordId });
  await deleteServiceRecord(user.id, recordId);
  await removePhotoFiles(paths);
  revalidatePath(`/garage/${vehicleId}`, "layout");
}
