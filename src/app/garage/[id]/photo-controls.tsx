"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { PHOTO_ACCEPT, withResizedPhoto } from "@/lib/resize-image";
import { changeVehiclePhoto, removeVehiclePhoto } from "../actions";

// "Change photo" uploads as soon as a picture is chosen.
export function PhotoControls({ vehicleId, hasPhoto }: { vehicleId: string; hasPhoto: boolean }) {
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

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <form ref={formRef} action={submit}>
          <label className="cursor-pointer text-steel hover:text-chalk">
            {pending ? "Uploading…" : hasPhoto ? "Change photo" : "Add a photo"}
            <input
              type="file"
              name="photo"
              accept={PHOTO_ACCEPT}
              className="sr-only"
              disabled={pending}
              onChange={() => formRef.current?.requestSubmit()}
            />
          </label>
        </form>
        {hasPhoto && !pending && (
          <form action={removeVehiclePhoto.bind(null, vehicleId)}>
            <button type="submit" className="text-steel hover:text-overdue">
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
