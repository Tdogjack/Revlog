"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadPhoto } from "@/app/garage/[id]/photos/actions";
import { PhotoStrip, type StripPhoto } from "@/components/photo-strip";
import { PHOTO_ACCEPT, resizeImage } from "@/lib/resize-image";

// Photos on the service and mod forms. Editing uploads straight to the saved
// record; a new one has no id yet, so photos wait here until it's saved.
export type FormPhotos = {
  vehicleId: string;
  max: number;
  target?: { id: string; photos: StripPhoto[] };
};

export type QueuedPhoto = { key: number; file: File; url: string };

let nextKey = 0;

// Uploads queued photos one at a time once the record exists. Returns
// whether every photo made it.
export async function uploadQueued(
  vehicleId: string,
  kind: "mod" | "record",
  targetId: string,
  queued: QueuedPhoto[],
) {
  let ok = true;
  for (const q of queued) {
    const fd = new FormData();
    fd.set("photo", q.file);
    const result = await uploadPhoto(vehicleId, kind, targetId, fd);
    if (result.error) ok = false;
  }
  return ok;
}

export function FormPhotosField({
  photos,
  kind,
  label,
  hint,
  queued,
  onQueue,
}: {
  photos: FormPhotos;
  kind: "mod" | "record";
  label: string;
  hint?: string;
  queued: QueuedPhoto[];
  onQueue: (queued: QueuedPhoto[]) => void;
}) {
  return (
    <div>
      <span className="field-label block">{label}</span>
      {hint && <span className="field-hint mt-0.5">{hint}</span>}
      {photos.target ? (
        <PhotoStrip
          vehicleId={photos.vehicleId}
          kind={kind}
          targetId={photos.target.id}
          photos={photos.target.photos}
          max={photos.max}
          addLabel="Add photos"
        />
      ) : (
        <QueuedPhotos max={photos.max} queued={queued} onQueue={onQueue} />
      )}
    </div>
  );
}

function QueuedPhotos({
  max,
  queued,
  onQueue,
}: {
  max: number;
  queued: QueuedPhoto[];
  onQueue: (queued: QueuedPhoto[]) => void;
}) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(queued);
  const room = max - queued.length;

  useEffect(() => {
    latest.current = queued;
  }, [queued]);

  // Previews are object URLs; release them when the form goes away.
  useEffect(() => () => latest.current.forEach((q) => URL.revokeObjectURL(q.url)), []);

  async function add(files: File[]) {
    setError(null);
    const chosen = files.slice(0, room);
    if (files.length > room) setError(`Only ${room} more photo${room === 1 ? "" : "s"} fit here.`);
    setPreparing(true);
    const added: QueuedPhoto[] = [];
    for (const file of chosen) {
      try {
        const resized = await resizeImage(file, 1600);
        added.push({ key: nextKey++, file: resized, url: URL.createObjectURL(resized) });
      } catch (err) {
        setError((err as Error).message);
      }
    }
    onQueue([...latest.current, ...added]);
    setPreparing(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(q: QueuedPhoto) {
    URL.revokeObjectURL(q.url);
    onQueue(queued.filter((p) => p.key !== q.key));
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {queued.map((q, i) => (
          <div
            key={q.key}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-graphite bg-carbon"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              title="Remove photo"
              onClick={() => remove(q)}
              className="absolute top-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
        {room > 0 && (
          <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-graphite text-steel hover:border-steel hover:text-chalk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-redline">
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span className="sr-only">Add photos</span>
            <input
              ref={inputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              className="sr-only"
              disabled={preparing}
              onChange={(e) => add([...(e.target.files ?? [])])}
            />
          </label>
        )}
      </div>
      {preparing && <p className="mt-1 text-xs text-steel">Preparing photos…</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-overdue">
          {error}
        </p>
      )}
    </div>
  );
}
