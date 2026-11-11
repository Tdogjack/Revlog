"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Crop, ImagePlus, X } from "lucide-react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { editPhotos, photoFromUrl } from "@/components/photo-editor";
import { POST_TAGS } from "@/lib/post-tags";
import { PHOTO_ACCEPT, resizeImage, toBrowserImage } from "@/lib/resize-image";
import { orderPhotos, uploadPostPhoto, type PostFormState } from "../actions";

const inputClass = "field mt-1";

// `thumb` is the small copy shown in the grids; `url` is the full photo, for cropping.
type SharePhoto = { id: string; url: string; thumb?: string; fromMod: boolean };
type PostPhoto = { id: string; url: string; thumbUrl?: string };

// One photo in the post, in the order it'll show: already on the post, picked
// from the garage, or uploaded just for this post.
type Entry =
  | { key: string; kind: "post"; id: string; url: string; thumb?: string }
  | { key: string; kind: "garage"; id: string; url: string; thumb?: string }
  | { key: string; kind: "upload"; file: File; url: string };

let nextKey = 0;
const newKey = () => `photo-${nextKey++}`;

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
  // Photos already on the post, when updating a build or editing a post.
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
  const [dragging, setDragging] = useState<number | null>(null);
  // Edits start with the post's photos; mod posts start with the mod's photos,
  // other new posts with the first few garage photos.
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (currentPhotos) {
      return currentPhotos.map((p) => ({
        key: newKey(),
        kind: "post",
        id: p.id,
        url: p.url,
        thumb: p.thumbUrl,
      }));
    }
    const fromMod = photos.filter((p) => p.fromMod);
    return (fromMod.length ? fromMod : photos)
      .slice(0, Math.min(6, maxPhotos))
      .map((p) => ({ key: newKey(), kind: "garage", id: p.id, url: p.url, thumb: p.thumb }));
  });
  const room = maxPhotos - entries.length;
  const editing = !!currentPhotos;

  // Free upload previews when they're removed, and the rest when the page closes.
  const latest = useRef(entries);
  useEffect(() => {
    latest.current = entries;
  }, [entries]);
  useEffect(
    () => () =>
      latest.current.forEach((e) => e.kind === "upload" && URL.revokeObjectURL(e.url)),
    [],
  );

  function remove(key: string) {
    const entry = entries.find((e) => e.key === key);
    if (entry?.kind === "upload") URL.revokeObjectURL(entry.url);
    setEntries((current) => current.filter((e) => e.key !== key));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= entries.length || from === to) return;
    setEntries((current) => {
      const next = [...current];
      const [entry] = next.splice(from, 1);
      next.splice(to, 0, entry);
      return next;
    });
  }

  function toggleGarage(photo: SharePhoto) {
    const inPost = entries.find((e) => e.kind === "garage" && e.id === photo.id);
    if (inPost) remove(inPost.key);
    else if (room > 0) {
      setEntries((current) => [
        ...current,
        { key: newKey(), kind: "garage", id: photo.id, url: photo.url, thumb: photo.thumb },
      ]);
    }
  }

  async function addFiles(files: File[]) {
    setState(undefined);
    // Crop and rotate first; cancelling adds nothing.
    const chosen = await editPhotos(files.slice(0, room));
    if (!chosen || chosen.length === 0) return;
    // HEIC photos are converted up front so their previews show in every browser.
    const readable = (
      await Promise.all(chosen.map((f) => toBrowserImage(f).catch(() => null)))
    ).filter((f): f is File => f !== null);
    if (readable.length < chosen.length) {
      setState({ error: "Some photos couldn't be read. Try a JPG, PNG, or HEIC." });
    } else if (files.length > room) {
      setState({ error: `Posts can have up to ${maxPhotos} photos.` });
    }
    setEntries((current) => [
      ...current,
      ...readable.map((file) => ({
        key: newKey(),
        kind: "upload" as const,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  // Cropping any photo makes an edited copy for this post, in the same spot.
  // Garage originals are left as they are.
  async function crop(entry: Entry) {
    setState(undefined);
    let file: File;
    try {
      file = entry.kind === "upload" ? entry.file : await photoFromUrl(entry.url);
    } catch (err) {
      setState({ error: (err as Error).message });
      return;
    }
    const [result] = (await editPhotos([file], { done: "Save photo" })) ?? [];
    if (!result || result === file) return;
    if (entry.kind === "upload") URL.revokeObjectURL(entry.url);
    setEntries((current) =>
      current.map((e) =>
        e.key === entry.key
          ? { key: newKey(), kind: "upload", file: result, url: URL.createObjectURL(result) }
          : e,
      ),
    );
  }

  function submit(formData: FormData) {
    setState(undefined);
    startTransition(async () => {
      setProgress(editing ? "Saving…" : "Posting…");
      const result = await action(undefined, formData);
      if (!result?.postId) {
        setState(result);
        setProgress(null);
        return;
      }
      const postId = result.postId;
      // The post exists now; add the new photos one at a time.
      const uploads = entries.filter((e) => e.kind === "upload");
      const uploaded: Record<string, string> = {};
      let failed = 0;
      for (const [i, entry] of uploads.entries()) {
        setProgress(`Uploading photo ${i + 1} of ${uploads.length}…`);
        try {
          const fd = new FormData();
          fd.set("photo", await resizeImage(entry.file, 1600));
          const saved = await uploadPostPhoto(postId, fd);
          if ("id" in saved && saved.id) uploaded[entry.key] = saved.id;
          else failed++;
        } catch {
          failed++;
        }
      }
      // Then put everything in the order shown here.
      const order = entries.flatMap((e) => {
        const id =
          e.kind === "post"
            ? e.id
            : e.kind === "garage"
              ? result.added?.[e.id]
              : uploaded[e.key];
        return id ? [id] : [];
      });
      if (order.length > 1) await orderPhotos(postId, order);
      router.push(`/community/${postId}${failed ? `?failed=${failed}` : ""}`);
    });
  }

  return (
    <form action={submit} className="mt-6 space-y-5 rounded-lg border border-graphite bg-panel p-5 sm:p-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {modId && <input type="hidden" name="modId" value={modId} />}
      {entries.map((e) =>
        e.kind === "garage" ? (
          <input key={e.key} type="hidden" name="photoIds" value={e.id} />
        ) : e.kind === "post" ? (
          <input key={e.key} type="hidden" name="keepPhotoIds" value={e.id} />
        ) : null,
      )}

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
        <p className="field-label">
          Photos in this post ({entries.length} of up to {maxPhotos})
        </p>
        <p className="field-hint mt-1">
          The first photo leads the post. Drag photos, or use the arrows, to change the order.
        </p>
        <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {entries.map((e, i) => (
            <li
              key={e.key}
              draggable
              onDragStart={(ev) => {
                setDragging(i);
                ev.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(ev) => {
                if (dragging === null) return;
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "move";
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                if (dragging !== null) move(dragging, i);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              className={`relative overflow-hidden rounded-md border-2 bg-carbon ${dragging === i ? "border-steel opacity-50" : "border-graphite"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(e.kind !== "upload" && e.thumb) || e.url}
                onError={(ev) => {
                  if (ev.currentTarget.src !== e.url) ev.currentTarget.src = e.url;
                }}
                alt=""
                className="aspect-square w-full cursor-grab object-cover"
              />
              <span className="readout absolute top-1 left-1 rounded bg-carbon/85 px-1.5 text-xs text-chalk">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(e.key)}
                aria-label={`Remove photo ${i + 1}`}
                title="Remove photo"
                className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-carbon/85 text-chalk hover:text-overdue"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <div className="flex items-center justify-between border-t border-graphite bg-panel">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move photo ${i + 1} earlier`}
                  title="Move earlier"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                {/* An edited copy is uploaded, which needs a confirmed email. */}
                {(canUpload || e.kind === "upload") && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => crop(e)}
                    aria-label={`Crop or rotate photo ${i + 1}`}
                    title="Crop or rotate"
                  >
                    <Crop className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i + 1)}
                  disabled={i === entries.length - 1}
                  aria-label={`Move photo ${i + 1} later`}
                  title="Move later"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
          {room > 0 && canUpload && (
            <li>
              <label className="flex aspect-square h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-graphite text-xs text-steel hover:border-steel hover:text-chalk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-redline">
                <ImagePlus className="h-5 w-5" aria-hidden />
                Upload photos
                <input
                  type="file"
                  accept={PHOTO_ACCEPT}
                  multiple
                  className="sr-only"
                  disabled={pending}
                  onChange={(ev) => {
                    addFiles([...(ev.target.files ?? [])]);
                    ev.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ol>
        {!canUpload && (
          <div className="mt-2">
            <ConfirmEmailNote action="upload photos" />
          </div>
        )}

        <p className="mt-5 text-xs font-medium text-chalk">Add from your garage</p>
        {photos.length === 0 ? (
          <p className="mt-1 text-xs text-steel">
            No garage photos for this car yet. Upload some above instead.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((p) => {
              const on = entries.some((e) => e.kind === "garage" && e.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleGarage(p)}
                  aria-pressed={on}
                  aria-label={on ? "Take this garage photo out of the post" : "Add this garage photo to the post"}
                  disabled={!on && room === 0}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${on ? "border-redline" : "border-graphite opacity-60"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb ?? p.url} alt="" className="h-full w-full object-cover" />
                  {on && (
                    <span className="absolute top-1 right-1 rounded-full bg-redline-fill p-0.5 text-on-accent">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-steel">
          Garage photos are copied to the public post; uploads here go only to the post, not your
          garage. Cropping a garage photo here changes only the post&apos;s copy. Receipts are never
          shared.
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
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
        {pending ? (progress ?? "Posting…") : submitLabel}
      </button>
    </form>
  );
}
