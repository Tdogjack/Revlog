"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { FEATURED_BUILD_TAG } from "@/lib/community";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";
import { clearVehiclePhoto, replaceVehiclePhoto } from "@/lib/gallery";
import { readPhoto, uploadVehiclePhoto } from "@/lib/photos";
import { buildServicePlan, readAnswers } from "@/lib/service-plan";
import { deleteVehicle } from "@/lib/vehicle-removal";
import {
  createVehicle,
  getVehicle,
  moveVehicle,
  setVehicleOrder,
  readVehicleFields,
  removalConfirmed,
  setVehicleFavorite,
  setVehiclePhoto,
  updateVehicle,
  vehicleInput,
} from "@/lib/vehicles";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

export async function addVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = readVehicleFields((k) => formData.get(k));

  const parsed = vehicleInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: raw };
  }

  const photo = readPhoto(formData);
  if (photo && "error" in photo) return { error: photo.error, values: raw };
  if (photo && !(await isEmailVerified(user.id))) {
    return { error: CONFIRM_EMAIL_FIRST, values: raw };
  }

  // Built here rather than sent by the browser, so what's saved can't be altered.
  const plan = buildServicePlan(parsed.data, readAnswers(formData));
  const vehicle = await createVehicle(user.id, parsed.data, plan.items);

  if (photo) {
    try {
      const path = await uploadVehiclePhoto(user.id, vehicle.id, photo);
      await setVehiclePhoto(user.id, vehicle.id, path);
    } catch (err) {
      // The car is saved either way; the photo can be added from its page.
      console.error("Photo upload failed", err);
    }
  }

  redirect(`/garage/${vehicle.id}/service/import?new=1`);
}

export async function editVehicle(
  vehicleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const raw = readVehicleFields((k) => formData.get(k));

  const parsed = vehicleInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: raw };
  }

  const found = await updateVehicle(user.id, vehicleId, parsed.data);
  if (!found) return { error: "That car wasn't found.", values: raw };

  revalidatePath("/garage");
  revalidatePath(`/garage/${vehicleId}`);
  redirect(`/garage/${vehicleId}`);
}

export type PhotoState = { error?: string; ok?: boolean } | undefined;

export async function changeVehiclePhoto(
  vehicleId: string,
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const user = await requireUser();
  const error = await replaceVehiclePhoto(user.id, vehicleId, formData);
  if (error) return { error };
  revalidatePath(`/garage/${vehicleId}`);
  return { ok: true };
}

export async function removeVehiclePhoto(vehicleId: string) {
  const user = await requireUser();
  await clearVehiclePhoto(user.id, vehicleId);
  revalidatePath(`/garage/${vehicleId}`);
}

export async function removeVehicle(vehicleId: string, formData: FormData) {
  const user = await requireUser();
  const car = await getVehicle(user.id, vehicleId);
  if (!car) redirect("/garage");
  if (!removalConfirmed(car, String(formData.get("confirm") ?? ""))) {
    redirect(`/garage/${vehicleId}?remove=mismatch`);
  }

  await deleteVehicle(user.id, vehicleId);
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/garage");
  revalidatePath("/community");
  redirect("/garage");
}

export async function toggleFavorite(vehicleId: string, favorite: boolean) {
  const user = await requireUser();
  await setVehicleFavorite(user.id, vehicleId, favorite);
  revalidatePath("/garage");
}

// Saves the order the cars were dragged into.
export async function orderVehicles(ids: string[]) {
  const user = await requireUser();
  await setVehicleOrder(user.id, ids.map(String));
  revalidatePath("/garage");
}

export async function reorderVehicle(vehicleId: string, direction: "up" | "down") {
  const user = await requireUser();
  await moveVehicle(user.id, vehicleId, direction === "up" ? "up" : "down");
  revalidatePath("/garage");
}
