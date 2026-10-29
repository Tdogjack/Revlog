"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { POST_TAGS } from "@/lib/post-tags";
import { resizeImage } from "@/lib/resize-image";
import { uploadPostPhoto, type PostFormState } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

type SharePhoto = { id: string; url: string; fromMod: boolean };
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
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<PostFormState>(undefined);
  const [progress, setProgress] = useState<string | null>(null);
  // Mod posts start with the mod's photos picked; build posts with the first few.
  const [picked, setPicked] = useState<string[]>(() => {
    const fromMod = photos.filter((p) => p.fromMod).map((p) => p.id);
    return (fromMod.length ? fromMod : photos.map((p) => p.id)).slice(0, Math.min(6, maxPhotos));
  });
  const [added, setAdded] = useState<NewPhoto[]>([]);
  const room = maxPhotos - picked.length - added.length;

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

  function addFiles(files: File[]) {
    const fit = files.slice(0, room);
    setAdded((current) => [
      ...current,
      ...fit.map((file) => ({
        key: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
    if (files.length > fit.length) {
      setState({ error: `Posts can have up to ${maxPhotos} photos.` });
    }
  }

  function submit(formData: FormData) {
    setState(undefined);
    startTransition(async () => {
      setProgress("Posting…");
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
    <form action={submit} className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {modId && <input type="hidden" name="modId" value={modId} />}
      {picked.map((id) => (
        <input key={id} type="hidden" name="photoIds" value={id} />
      ))}

      <div className="text-sm">
        <span className="text-steel">Tag</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {POST_TAGS.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input
                type="radio"
                name="tag"
                value={t.value}
                defaultChecked={(state?.values?.tag ?? defaultTag) === t.value}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-graphite px-3 py-1 text-xs text-steel peer-checked:border-redline peer-checked:bg-redline/15 peer-checked:text-chalk peer-focus-visible:ring-2 peer-focus-visible:ring-redline hover:border-steel">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="text-steel">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={state?.values?.title ?? defaultTitle}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="text-steel">Tell the story (optional)</span>
        <textarea
          name="body"
          rows={5}
          maxLength={4000}
          placeholder="What you did, how it went, what's next…"
          defaultValue={state?.values?.body}
          className={inputClass}
        />
      </label>

      <div className="text-sm">
        <p className="text-steel">
          Photos ({picked.length + added.length} of up to {maxPhotos})
        </p>

        <p className="mt-3 text-xs font-medium text-chalk">From your garage</p>
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
          {room > 0 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-graphite text-xs text-steel hover:border-steel hover:text-chalk">
              <ImagePlus className="h-5 w-5" aria-hidden />
              Upload
              <input
                type="file"
                accept="image/*"
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
        className="w-full rounded-md bg-redline py-2.5 font-medium text-white hover:bg-redline-hover disabled:opacity-60"
      >
        {pending ? (progress ?? "Posting…") : "Post to community"}
      </button>
    </form>
  );
}
