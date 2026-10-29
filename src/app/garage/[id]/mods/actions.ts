"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createMod,
  deleteMod,
  modInput,
  modStatusInput,
  setModStatus,
  updateMod,
} from "@/lib/mods";
import { checkPricesLater, parsePartRows, syncParts } from "@/lib/parts";

export type ModFormState = { error?: string; values?: Record<string, string> } | undefined;

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
  checkPricesLater(await syncParts(user.id, vehicleId, { modId: mod.id }, partRows.rows));

  redirect(`/garage/${vehicleId}`);
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
  checkPricesLater(await syncParts(user.id, vehicleId, { modId: mod.id }, partRows.rows));

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
  await deleteMod(user.id, modId);
  revalidatePath(`/garage/${vehicleId}`);
}
