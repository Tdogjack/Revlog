"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { removePhoto, uploadPhoto } from "@/app/garage/[id]/photos/actions";
import { PHOTO_ACCEPT, resizeImage } from "@/lib/resize-image";

export type StripPhoto = { id: string; url: string };

type Props = {
  vehicleId: string;
  kind: "build" | "mod" | "record";
  targetId?: string;
  photos: StripPhoto[];
  max: number;
  addLabel: string;
  size?: "large" | "small";
};

// A row (or grid) of photos with multi-select upload and a full-size viewer.
export function PhotoStrip({
  vehicleId,
  kind,
  targetId,
  photos,
  max,
  addLabel,
  size = "small",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = max - photos.length;

  function upload(files: File[]) {
    setError(null);
    const chosen = files.slice(0, room);
    if (files.length > room) setError(`Only ${room} more photo${room === 1 ? "" : "s"} fit here.`);
    startTransition(async () => {
      for (const [i, file] of chosen.entries()) {
        setProgress(`Uploading ${i + 1} of ${chosen.length}…`);
        let resized: File;
        try {
          resized = await resizeImage(file, 1600);
        } catch (err) {
          setError((err as Error).message);
          continue;
        }
        const fd = new FormData();
        fd.set("photo", resized);
        const result = await uploadPhoto(vehicleId, kind, targetId ?? null, fd);
        if (result.error) {
          setError(result.error);
          break;
        }
      }
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const thumb =
    size === "large" ? "aspect-[4/3] w-full rounded-lg" : "h-16 w-16 shrink-0 rounded-md";

  return (
    <div className={size === "small" ? "mt-3" : ""}>
      <div
        className={
          size === "large" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2"
        }
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className={`overflow-hidden border border-graphite bg-carbon ${thumb}`}
          >
            {/* Signed links expire, so these skip Next's image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
        {room > 0 && (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-graphite text-xs text-steel hover:border-steel hover:text-chalk ${thumb} ${size === "small" ? "" : "min-h-24"}`}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            {size === "large" && <span>{pending ? progress : addLabel}</span>}
            <span className="sr-only">{addLabel}</span>
            <input
              ref={inputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              className="sr-only"
              disabled={pending}
              onChange={(e) => upload([...(e.target.files ?? [])])}
            />
          </label>
        )}
      </div>
      {size === "small" && pending && <p className="mt-1 text-xs text-steel">{progress}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-overdue">
          {error}
        </p>
      )}
      {open !== null && photos[open] && (
        <PhotoViewer
          photos={photos}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onDelete={(id) => {
            setOpen(null);
            startTransition(() => removePhoto(vehicleId, id));
          }}
        />
      )}
    </div>
  );
}

function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  onDelete,
}: {
  photos: StripPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const photo = photos[index];
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" className="max-h-[80vh] max-w-full rounded-lg object-contain" />
        <div className="mt-3 flex items-center justify-between text-sm text-chalk">
          <div className="flex items-center gap-2">
            {photos.length > 1 && (
              <>
                <button type="button" onClick={prev} aria-label="Previous photo">
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <span className="text-steel">
                  {index + 1} / {photos.length}
                </span>
                <button type="button" onClick={next} aria-label="Next photo">
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this photo?")) onDelete(photo.id);
                }}
                className="flex items-center gap-1 text-steel hover:text-overdue"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Read-only gallery with the same viewer, for community posts.
export function PhotoGallery({ photos }: { photos: StripPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <>
      <div
        className={`grid gap-2 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className={`overflow-hidden rounded-lg border border-graphite bg-carbon ${photos.length === 1 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && photos[open] && (
        <PhotoViewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
