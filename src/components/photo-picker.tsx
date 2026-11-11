"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { editPhotos } from "@/components/photo-editor";
import { PHOTO_ACCEPT, toBrowserImage } from "@/lib/resize-image";

type Props = { label?: string; onChoose?: () => void };

// A file input named "photo" with a live preview of the chosen picture.
export function PhotoPicker({ label = "Photo (optional)", onChoose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="text-sm">
      <span className="text-steel">{label}</span>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-graphite bg-carbon">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Chosen photo" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-steel" aria-hidden />
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-graphite px-3 py-2 hover:border-steel">
          {preview ? "Choose a different photo" : "Choose a photo"}
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={async (e) => {
              const input = e.currentTarget;
              const picked = input.files?.[0];
              setPreview(null);
              if (!picked) return;
              // Crop and rotate first; cancelling clears the choice.
              const [file] = (await editPhotos([picked])) ?? [];
              if (!file) {
                input.value = "";
                return;
              }
              const files = new DataTransfer();
              files.items.add(file);
              input.files = files.files;
              onChoose?.();
              // HEIC needs converting before Chrome and Firefox can show it.
              toBrowserImage(file)
                .then((shown) => setPreview(URL.createObjectURL(shown)))
                .catch(() => {});
            }}
          />
        </label>
      </div>
    </div>
  );
}
