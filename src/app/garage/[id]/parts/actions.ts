"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  checkPartPrice,
  deletePart,
  getPart,
  partInput,
  updatePart,
} from "@/lib/parts";

export type PartFormState =
  { error?: string; warning?: string; ok?: boolean; values?: Record<string, string> } | undefined;

const FIELDS = ["name", "url", "quantity", "price", "trackPrice"];

function readForm(formData: FormData) {
  return Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
}

export async function editPart(
  vehicleId: string,
  partId: string,
  _prev: PartFormState,
  formData: FormData,
): Promise<PartFormState> {
  const user = await requireUser();
  const raw = readForm(formData);
  const parsed = partInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const part = await updatePart(user.id, partId, parsed.data);
  if (!part) return { error: "That part wasn't found.", values: raw };

  const warning = part.trackPrice && !part.lastCheckedAt ? await checkPartPrice(part) : null;
  revalidatePath(`/garage/${vehicleId}`);
  return { ok: true, warning: warning ?? undefined };
}

export async function removePart(vehicleId: string, partId: string) {
  const user = await requireUser();
  await deletePart(user.id, partId);
  revalidatePath(`/garage/${vehicleId}`);
}

export type PriceCheckState = { error?: string } | undefined;

export async function refreshPartPrice(
  vehicleId: string,
  partId: string,
): Promise<PriceCheckState> {
  const user = await requireUser();
  const part = await getPart(user.id, partId);
  if (!part) return { error: "That part wasn't found." };

  // Stores don't like being hammered; once a minute per part is plenty.
  if (part.lastCheckedAt && Date.now() - part.lastCheckedAt.getTime() < 60_000) {
    return { error: "Just checked. Try again in a minute." };
  }
  const error = await checkPartPrice(part);
  revalidatePath(`/garage/${vehicleId}`);
  return error ? { error } : undefined;
}
