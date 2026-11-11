"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { editPhotos, photoFromUrl } from "@/components/photo-editor";
import { PHOTO_ACCEPT, resizeImage, withResizedPhoto } from "@/lib/resize-image";
import { changeVehiclePhoto, removeVehiclePhoto } from "../actions";

// "Change photo" opens the crop and rotate editor, then uploads.
export function PhotoControls({
  vehicleId,
  hasPhoto,
  photoUrl,
  canUpload,
}: {
  vehicleId: string;
  hasPhoto: boolean;
  // The current photo, so it can be cropped or rotated in place.
  photoUrl?: string | null;
  canUpload: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    changeVehiclePhoto.bind(null, vehicleId),
    undefined,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const error = photoError ?? state?.error;

  async function submit(formData: FormData) {
    setPhotoError(null);
    try {
      await withResizedPhoto(formData);
    } catch (err) {
      setPhotoError((err as Error).message);
      return;
    }
    startTransition(() => formAction(formData));
  }

  // Crop and rotate the chosen photo, then send it. Cancelling sends nothing.
  async function chosen(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    const [result] = (await editPhotos([file])) ?? [];
    if (!result) {
      input.value = "";
      return;
    }
    const files = new DataTransfer();
    files.items.add(result);
    input.files = files.files;
    formRef.current?.requestSubmit();
  }

  async function editCurrent() {
    if (!photoUrl) return;
    setPhotoError(null);
    try {
      const file = await photoFromUrl(photoUrl);
      const [result] = (await editPhotos([file], { done: "Save photo" })) ?? [];
      if (!result || result === file) return;
      const formData = new FormData();
      formData.set("photo", await resizeImage(result));
      startTransition(() => formAction(formData));
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  }

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-4">
        {canUpload ? (
          <form ref={formRef} action={submit}>
            <label className="flex min-h-9 cursor-pointer items-center text-steel focus-within:text-chalk focus-within:underline hover:text-chalk">
              {pending ? "Uploading…" : hasPhoto ? "Change photo" : "Add a photo"}
              <input
                type="file"
                name="photo"
                accept={PHOTO_ACCEPT}
                className="sr-only"
                disabled={pending}
                onChange={(e) => chosen(e.currentTarget)}
              />
            </label>
          </form>
        ) : (
          <ConfirmEmailNote action="add a photo" />
        )}
        {hasPhoto && photoUrl && canUpload && !pending && (
          <button
            type="button"
            onClick={editCurrent}
            className="min-h-9 text-steel hover:text-chalk"
          >
            Crop or rotate
          </button>
        )}
        {hasPhoto && !pending && (
          <form action={removeVehiclePhoto.bind(null, vehicleId)}>
            <button type="submit" className="min-h-9 text-steel hover:text-overdue">
              Remove
            </button>
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-overdue">
          {error}
        </p>
      )}
    </div>
  );
}
