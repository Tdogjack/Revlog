"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";
import { addPhoto, deletePhoto, type PhotoTarget } from "@/lib/gallery";
import { readPhoto } from "@/lib/photos";
import { isUuid } from "@/lib/vehicles";

function readTarget(kind: string, id: string | null): PhotoTarget | null {
  if (kind === "build") return { kind: "build" };
  if ((kind === "mod" || kind === "record") && id && isUuid(id)) return { kind, id };
  return null;
}

// One photo per call, so each request stays under the upload size limit.
export async function uploadPhoto(
  vehicleId: string,
  kind: string,
  targetId: string | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!(await isEmailVerified(user.id))) return { error: CONFIRM_EMAIL_FIRST };
  const target = readTarget(kind, targetId);
  if (!target) return { error: "That photo doesn't have a place to go." };
  const photo = readPhoto(formData);
  if (!photo) return { error: "Choose a photo first." };
  if ("error" in photo) return { error: photo.error };

  const error = await addPhoto(user.id, vehicleId, target, photo);
  if (error) return { error };
  revalidatePath(`/garage/${vehicleId}`);
  return {};
}

export async function removePhoto(vehicleId: string, photoId: string) {
  const user = await requireUser();
  await deletePhoto(user.id, photoId);
  revalidatePath(`/garage/${vehicleId}`);
}
