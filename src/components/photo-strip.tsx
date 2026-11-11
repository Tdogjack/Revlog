"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crop,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import { removePhoto, replacePhoto, uploadPhoto } from "@/app/garage/[id]/photos/actions";
import { editPhotos, photoFromUrl } from "@/components/photo-editor";
import { PHOTO_ACCEPT, resizeImage } from "@/lib/resize-image";

// `thumb` is the small copy shown in grids and inline; `url` is the full photo
// for the full-size viewer.
export type StripPhoto = { id: string; url: string; thumb?: string };

type Props = {
  vehicleId: string;
  kind: "build" | "mod" | "record";
  targetId?: string;
  photos: StripPhoto[];
  max: number;
  addLabel: string;
  size?: "large" | "small";
  // Off where photos are only viewed and removed, like the car page's records.
  canAdd?: boolean;
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
  canAdd = true,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  // The large grid starts at two rows (with the add tile in the last spot) so
  // a big library doesn't fill the page; "Show all" opens the rest.
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = canAdd ? max - photos.length : 0;

  async function upload(files: File[]) {
    setError(null);
    const picked = files.slice(0, room);
    if (inputRef.current) inputRef.current.value = "";
    // Crop and rotate first; cancelling adds nothing.
    const chosen = await editPhotos(picked);
    if (!chosen || chosen.length === 0) return;
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
    });
  }

  // Crops or rotates a saved photo and saves it over the original.
  async function editSaved(photo: StripPhoto) {
    setError(null);
    let file: File;
    try {
      file = await photoFromUrl(photo.url);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    const result = await editPhotos([file], { done: "Save photo" });
    if (!result || result[0] === file) return;
    startTransition(async () => {
      setProgress("Saving photo…");
      try {
        const fd = new FormData();
        fd.set("photo", await resizeImage(result[0], 1600));
        const saved = await replacePhoto(vehicleId, photo.id, fd);
        if (saved.error) setError(saved.error);
      } catch (err) {
        setError((err as Error).message);
      }
      setProgress(null);
    });
  }

  const thumb =
    size === "large" ? "aspect-[4/3] w-full rounded-lg" : "h-16 w-16 shrink-0 rounded-md";
  // Two rows: 2 across on phones, 3 from sm up, less one spot for the add tile.
  const addSpot = room > 0 ? 1 : 0;
  const phoneShown = 4 - addSpot;
  const wideShown = 6 - addSpot;
  const collapsible = size === "large" && photos.length > phoneShown;
  const collapsed = collapsible && !expanded;
  const hideClass = (i: number) =>
    !collapsed ? "" : i >= wideShown ? "hidden" : i >= phoneShown ? "hidden sm:block" : "";

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
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            className={`overflow-hidden border border-graphite bg-carbon ${thumb} ${hideClass(i)}`}
          >
            {/* Signed links expire, so these skip Next's image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumb ?? p.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
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
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((on) => !on)}
          aria-expanded={expanded}
          // With few enough photos to fit on wider screens, only phones need it.
          className={`btn mt-3 w-full ${photos.length <= wideShown ? "sm:hidden" : ""}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden />
              Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Show all {photos.length} photos
            </>
          )}
        </button>
      )}
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
          onEdit={(photo) => {
            setOpen(null);
            editSaved(photo);
          }}
        />
      )}
    </div>
  );
}

export function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  onDelete,
  onEdit,
}: {
  photos: StripPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (photo: StripPhoto) => void;
}) {
  const photo = photos[index];

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
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <Carousel
          photos={photos}
          index={index}
          onIndex={onIndex}
          fit="contain"
          className="h-[80vh] rounded-lg"
        />
        <div className="mt-3 flex items-center justify-end gap-4 text-sm text-chalk">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(photo)}
              className="flex min-h-9 items-center gap-1 text-steel hover:text-chalk"
            >
              <Crop className="h-4 w-4" aria-hidden />
              Crop or rotate
            </button>
          )}
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
  );
}

// One photo at a time with arrows, swipe, a counter, and dots. Used inline on
// posts and inside the full-size viewer.
function Carousel({
  photos,
  index,
  onIndex,
  onOpen,
  fit,
  className,
}: {
  photos: StripPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onOpen?: (i: number) => void;
  fit: "cover" | "contain";
  className: string;
}) {
  const touchX = useRef<number | null>(null);
  const current = Math.min(index, photos.length - 1);
  const many = photos.length > 1;
  const go = (step: number) => onIndex((current + step + photos.length) % photos.length);

  return (
    <div
      className={`relative overflow-clip ${className}`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {photos.map((p, i) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              // Inline cards show the small copy; the full-size viewer the full photo.
              // Post photos saved before small copies existed fall back to the full one.
              src={fit === "cover" ? (p.thumb ?? p.url) : p.url}
              onError={(e) => {
                if (e.currentTarget.src !== p.url) e.currentTarget.src = p.url;
              }}
              alt=""
              className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
              loading={Math.abs(i - current) <= 1 ? "eager" : "lazy"}
            />
          );
          return onOpen ? (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Open photo ${i + 1}`}
              tabIndex={i === current ? 0 : -1}
              className="h-full w-full shrink-0"
            >
              {img}
            </button>
          ) : (
            <div key={p.id} className="h-full w-full shrink-0">
              {img}
            </div>
          );
        })}
      </div>
      {many && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
            {current + 1} / {photos.length}
          </span>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-white" : "bg-white/45"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Read-only carousel for community posts, with the full-size viewer on click.
export function PhotoGallery({ photos }: { photos: StripPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <Carousel
        photos={photos}
        index={index}
        onIndex={setIndex}
        onOpen={setOpen}
        fit="cover"
        className="aspect-[4/3] rounded-lg border border-graphite bg-carbon"
      />
      {open !== null && photos[open] && (
        <PhotoViewer
          photos={photos}
          index={open}
          onIndex={(i) => {
            setOpen(i);
            setIndex(i);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
