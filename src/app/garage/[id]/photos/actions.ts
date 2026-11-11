"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deletePhoto, replacePhotoFile, saveUploadedPhoto } from "@/lib/gallery";

// One photo per call, so each request stays under the upload size limit.
export async function uploadPhoto(
  vehicleId: string,
  kind: string,
  targetId: string | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const error = await saveUploadedPhoto(user.id, vehicleId, kind, targetId, formData);
  if (error) return { error };
  revalidatePath(`/garage/${vehicleId}`);
  return {};
}

// Swaps a photo for an edited (cropped or rotated) copy.
export async function replacePhoto(
  vehicleId: string,
  photoId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const error = await replacePhotoFile(user.id, photoId, formData);
  if (error) return { error };
  revalidatePath(`/garage/${vehicleId}`);
  return {};
}

export async function removePhoto(vehicleId: string, photoId: string) {
  const user = await requireUser();
  await deletePhoto(user.id, photoId);
  revalidatePath(`/garage/${vehicleId}`);
}
