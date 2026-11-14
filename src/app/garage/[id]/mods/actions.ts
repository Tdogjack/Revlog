"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import { editModEntry, logMod, readModFields } from "@/lib/mod-log";
import { deleteMod, modStatusInput, setModStatus } from "@/lib/mods";
import { scanModReceipt, type ModScanResult } from "@/lib/mod-scan";
import { scanBlocked } from "@/lib/scan-gate";

export type ModFormState =
  { error?: string; values?: Record<string, string>; savedId?: string } | undefined;

export async function addMod(
  vehicleId: string,
  _prev: ModFormState,
  formData: FormData,
): Promise<ModFormState> {
  const user = await requireUser();
  const raw = readModFields((k) => formData.get(k));
  const result = await logMod(user.id, vehicleId, raw);
  if ("error" in result) return { error: result.error, values: raw };

  // With photos waiting, the form uploads them to the new mod, then leaves.
  if (formData.get("stay")) return { savedId: result.id };
  redirect(`/garage/${vehicleId}/build`);
}

// Reads an order email, order page, receipt, or listing into form values.
// Nothing is saved here.
export async function scanModPhoto(formData: FormData): Promise<ModScanResult> {
  const user = await requireUser();
  const blocked = await scanBlocked(user.id);
  if (blocked) return { error: blocked };
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo to scan." };
  return scanModReceipt(user.id, photo);
}

export async function editMod(
  vehicleId: string,
  modId: string,
  _prev: ModFormState,
  formData: FormData,
): Promise<ModFormState> {
  const user = await requireUser();
  const raw = readModFields((k) => formData.get(k));
  const error = await editModEntry(user.id, vehicleId, modId, raw);
  if (error) return { error, values: raw };

  redirect(`/garage/${vehicleId}/build`);
}

export async function changeModStatus(vehicleId: string, modId: string, formData: FormData) {
  const user = await requireUser();
  const status = modStatusInput.safeParse(formData.get("status"));
  if (!status.success) return;
  await setModStatus(user.id, modId, status.data);
  revalidatePath(`/garage/${vehicleId}`, "layout");
}

export async function removeMod(vehicleId: string, modId: string) {
  const user = await requireUser();
  const paths = await photoPathsFor(user.id, { kind: "mod", id: modId });
  await deleteMod(user.id, modId);
  await removePhotoFiles(paths);
  revalidatePath(`/garage/${vehicleId}`, "layout");
}
