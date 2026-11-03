"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { POST_TAGS } from "@/lib/post-tags";
import { PHOTO_ACCEPT, resizeImage, toBrowserImage } from "@/lib/resize-image";
import { uploadPostPhoto, type PostFormState } from "../actions";

const inputClass = "field mt-1";

type SharePhoto = { id: string; url: string; fromMod: boolean };
type PostPhoto = { id: string; url: string };
type NewPhoto = { key: string; file: File; preview: string };

export function ShareForm({
  action,
  vehicleId,
  modId,
  defaultTitle,
  photos,
  maxPhotos,
  partCount,
  partScope,
  defaultTag,
  showTags = true,
  currentPhotos,
  defaultBody,
  defaultShowParts = false,
  submitLabel = "Post to community",
  canUpload = true,
}: {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  vehicleId: string;
  modId: string | null;
  defaultTitle: string;
  photos: SharePhoto[];
  maxPhotos: number;
  partCount: number;
  partScope: string;
  defaultTag: string;
  // Off for builds, which are always tagged Build.
  showTags?: boolean;
  // Photos already on the post, when updating a build.
  currentPhotos?: PostPhoto[];
  defaultBody?: string;
  defaultShowParts?: boolean;
  submitLabel?: string;
  // False until the account's email is confirmed.
  canUpload?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<PostFormState>(undefined);
  const [progress, setProgress] = useState<string | null>(null);
  // Updates keep the post's photos; mod posts start with the mod's photos
  // picked, other new posts with the first few.
  const [kept, setKept] = useState<string[]>(() => currentPhotos?.map((p) => p.id) ?? []);
  const [picked, setPicked] = useState<string[]>(() => {
    if (currentPhotos) return [];
    const fromMod = photos.filter((p) => p.fromMod).map((p) => p.id);
    return (fromMod.length ? fromMod : photos.map((p) => p.id)).slice(0, Math.min(6, maxPhotos));
  });
  const [added, setAdded] = useState<NewPhoto[]>([]);
  const room = maxPhotos - kept.length - picked.length - added.length;

  // Free preview images when they're removed, and the rest when the page closes.
  const addedRef = useRef(added);
  useEffect(() => {
    addedRef.current = added;
  }, [added]);
  useEffect(() => () => addedRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);
  function removeAdded(key: string) {
    const photo = added.find((p) => p.key === key);
    if (photo) URL.revokeObjectURL(photo.preview);
    setAdded((current) => current.filter((p) => p.key !== key));
  }

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : room > 0
          ? [...current, id]
          : current,
    );
  }

  function toggleKept(id: string) {
    setKept((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : room > 0
          ? [...current, id]
          : current,
    );
  }

  async function addFiles(files: File[]) {
    // HEIC photos are converted up front so their previews show in every browser.
    const fit = (
      await Promise.all(files.slice(0, room).map((f) => toBrowserImage(f).catch(() => null)))
    ).filter((f): f is File => f !== null);
    if (fit.length < Math.min(files.length, room)) {
      setState({
        error: "Some photos couldn't be read. Try a JPG, PNG, or HEIC.",
      });
    }
    setAdded((current) => [
      ...current,
      ...fit.map((file) => ({
        key: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
    if (files.length > room) {
      setState({ error: `Posts can have up to ${maxPhotos} photos.` });
    }
  }

  function submit(formData: FormData) {
    setState(undefined);
    startTransition(async () => {
      setProgress(currentPhotos ? "Saving…" : "Posting…");
      const result = await action(undefined, formData);
      if (!result?.postId) {
        setState(result);
        setProgress(null);
        return;
      }
      // The post exists now; add the new photos one at a time.
      let failed = 0;
      for (const [i, photo] of added.entries()) {
        setProgress(`Uploading photo ${i + 1} of ${added.length}…`);
        try {
          const fd = new FormData();
          fd.set("photo", await resizeImage(photo.file, 1600));
          if ((await uploadPostPhoto(result.postId, fd)).error) failed++;
        } catch {
          failed++;
        }
      }
      router.push(`/community/${result.postId}${failed ? `?failed=${failed}` : ""}`);
    });
  }

  return (
    <form action={submit} className="mt-6 space-y-5 rounded-lg border border-graphite bg-panel p-5 sm:p-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {modId && <input type="hidden" name="modId" value={modId} />}
      {picked.map((id) => (
        <input key={id} type="hidden" name="photoIds" value={id} />
      ))}
      {currentPhotos
        ?.filter((p) => kept.includes(p.id))
        .map((p) => (
          <input key={p.id} type="hidden" name="keepPhotoIds" value={p.id} />
        ))}

      {showTags && (
        <div className="text-sm">
          <span className="field-label">Tag</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {POST_TAGS.filter((t) => t.value !== "build").map((t) => (
              <label key={t.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="tag"
                  value={t.value}
                  defaultChecked={(state?.values?.tag ?? defaultTag) === t.value}
                  className="peer sr-only"
                />
                <span className="block rounded-md border border-graphite px-3 py-1.5 text-sm text-steel peer-checked:border-chalk/60 peer-checked:bg-graphite peer-checked:text-chalk peer-focus-visible:ring-2 peer-focus-visible:ring-redline hover:border-steel">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="field-label">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={state?.values?.title ?? defaultTitle}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Tell the story (optional)</span>
        <textarea
          name="body"
          rows={5}
          maxLength={4000}
          placeholder="What you did, how it went, what's next…"
          defaultValue={state?.values?.body ?? defaultBody}
          className={inputClass}
        />
      </label>

      <div className="text-sm">
        <p className="text-steel">
          Photos ({kept.length + picked.length + added.length} of up to {maxPhotos})
        </p>

        {currentPhotos && currentPhotos.length > 0 && (
          <>
            <p className="mt-3 text-xs font-medium text-chalk">On your build now</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {currentPhotos.map((p) => {
                const on = kept.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleKept(p.id)}
                    aria-pressed={on}
                    aria-label={on ? "Remove from build" : "Keep on build"}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 ${on ? "border-redline" : "border-graphite opacity-40"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {on && (
                      <span className="absolute top-1 right-1 rounded-full bg-redline p-0.5 text-white">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-steel">Tap a photo to take it off the build.</p>
          </>
        )}

        <p className="mt-3 text-xs font-medium text-chalk">
          {currentPhotos ? "Add from your garage" : "From your garage"}
        </p>
        {photos.length === 0 ? (
          <p className="mt-1 text-xs text-steel">
            No garage photos for this car yet. Upload some below instead.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${on ? "border-redline" : "border-graphite opacity-60"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  {on && (
                    <span className="absolute top-1 right-1 rounded-full bg-redline p-0.5 text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs font-medium text-chalk">New for this post</p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {added.map((p) => (
            <div
              key={p.key}
              className="relative aspect-square overflow-hidden rounded-md border-2 border-redline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAdded(p.key)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 rounded-full bg-carbon/80 p-0.5 text-chalk hover:text-overdue"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ))}
          {room > 0 && canUpload && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-graphite text-xs text-steel hover:border-steel hover:text-chalk">
              <ImagePlus className="h-5 w-5" aria-hidden />
              Upload
              <input
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  addFiles([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {!canUpload && (
          <div className="mt-2">
            <ConfirmEmailNote action="upload photos" />
          </div>
        )}
        <p className="mt-2 text-xs text-steel">
          Garage photos are copied to the public post; uploads here go only to the post, not your
          garage. Receipts are never shared.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="showParts"
          disabled={partCount === 0}
          defaultChecked={defaultShowParts && partCount > 0}
          className="mt-0.5 h-4 w-4 accent-redline"
        />
        <span>
          <span className="font-medium">Include part links</span>
          <span className="block text-xs text-steel">
            {partCount === 0
              ? `No parts on ${partScope} yet. Add parts with links on the car's page to share them.`
              : `Lists ${partCount} ${partCount === 1 ? "part" : "parts"} from ${partScope} with their links and current prices. Stays up to date as you edit them.`}
          </span>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-overdue">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg w-full"
      >
        {pending ? (progress ?? "Posting…") : submitLabel}
      </button>
    </form>
  );
}
