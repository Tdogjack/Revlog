"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import {
  createMod,
  deleteMod,
  modInput,
  modStatusInput,
  setModStatus,
  updateMod,
} from "@/lib/mods";
import { scanModReceipt, type ModScanResult } from "@/lib/mod-scan";
import { parsePartRows, settlePartsCost, syncParts } from "@/lib/parts";

export type ModFormState =
  { error?: string; values?: Record<string, string>; savedId?: string } | undefined;

const FIELDS = [
  "part",
  "brand",
  "category",
  "status",
  "cost",
  "installedOn",
  "installedMileage",
  "notes",
  "parts",
];

export async function addMod(
  vehicleId: string,
  _prev: ModFormState,
  formData: FormData,
): Promise<ModFormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const parsed = modInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };
  const partRows = parsePartRows(raw.parts);
  if ("error" in partRows) return { error: partRows.error, values: raw };

  const mod = await createMod(user.id, vehicleId, parsed.data);
  if (!mod) return { error: "That car wasn't found.", values: raw };
  const parent = { modId: mod.id };
  const toCheck = await syncParts(user.id, vehicleId, parent, partRows.rows);
  await settlePartsCost(user.id, parent, toCheck, parsed.data.cost != null);

  // With photos waiting, the form uploads them to the new mod, then leaves.
  if (formData.get("stay")) return { savedId: mod.id };
  redirect(`/garage/${vehicleId}`);
}

// Reads an order email, order page, receipt, or listing into form values.
// Nothing is saved here.
export async function scanModPhoto(formData: FormData): Promise<ModScanResult> {
  const user = await requireUser();
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
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const parsed = modInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };
  const partRows = parsePartRows(raw.parts);
  if ("error" in partRows) return { error: partRows.error, values: raw };

  const mod = await updateMod(user.id, vehicleId, modId, parsed.data);
  if (!mod) return { error: "That mod wasn't found.", values: raw };
  const parent = { modId: mod.id };
  const toCheck = await syncParts(user.id, vehicleId, parent, partRows.rows);
  await settlePartsCost(user.id, parent, toCheck, parsed.data.cost != null);

  redirect(`/garage/${vehicleId}`);
}

export async function changeModStatus(vehicleId: string, modId: string, formData: FormData) {
  const user = await requireUser();
  const status = modStatusInput.safeParse(formData.get("status"));
  if (!status.success) return;
  await setModStatus(user.id, modId, status.data);
  revalidatePath(`/garage/${vehicleId}`);
}

export async function removeMod(vehicleId: string, modId: string) {
  const user = await requireUser();
  const paths = await photoPathsFor(user.id, { kind: "mod", id: modId });
  await deleteMod(user.id, modId);
  await removePhotoFiles(paths);
  revalidatePath(`/garage/${vehicleId}`);
}
