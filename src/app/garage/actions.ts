"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deleteVehiclePhoto, readPhoto, uploadVehiclePhoto } from "@/lib/photos";
import { createVehicle, setVehiclePhoto, vehicleInput } from "@/lib/vehicles";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

export async function addVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(
    ["year", "make", "model", "trim", "nickname", "vin", "currentMileage"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );

  const parsed = vehicleInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: raw };
  }

  const photo = readPhoto(formData);
  if (photo && "error" in photo) return { error: photo.error, values: raw };

  const vehicle = await createVehicle(user.id, parsed.data);

  if (photo) {
    try {
      const path = await uploadVehiclePhoto(user.id, vehicle.id, photo);
      await setVehiclePhoto(user.id, vehicle.id, path);
    } catch (err) {
      // The car is saved either way; the photo can be added from its page.
      console.error("Photo upload failed", err);
    }
  }

  redirect(`/garage/${vehicle.id}`);
}

export type PhotoState = { error?: string; ok?: boolean } | undefined;

export async function changeVehiclePhoto(
  vehicleId: string,
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const user = await requireUser();
  const photo = readPhoto(formData);
  if (!photo) return { error: "Choose a photo first." };
  if ("error" in photo) return { error: photo.error };

  let path: string;
  try {
    path = await uploadVehiclePhoto(user.id, vehicleId, photo);
  } catch {
    return { error: "The photo didn't upload. Try again." };
  }

  const oldPath = await setVehiclePhoto(user.id, vehicleId, path);
  if (oldPath === undefined) {
    await deleteVehiclePhoto(path);
    return { error: "That car wasn't found." };
  }
  if (oldPath) await deleteVehiclePhoto(oldPath);

  revalidatePath(`/garage/${vehicleId}`);
  return { ok: true };
}

export async function removeVehiclePhoto(vehicleId: string) {
  const user = await requireUser();
  const oldPath = await setVehiclePhoto(user.id, vehicleId, null);
  if (oldPath) await deleteVehiclePhoto(oldPath);
  revalidatePath(`/garage/${vehicleId}`);
}
