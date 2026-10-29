"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import type { PostFormState } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline";

type SharePhoto = { id: string; url: string; fromMod: boolean };

export function ShareForm({
  action,
  vehicleId,
  modId,
  defaultTitle,
  photos,
  maxPhotos,
}: {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  vehicleId: string;
  modId: string | null;
  defaultTitle: string;
  photos: SharePhoto[];
  maxPhotos: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Mod posts start with the mod's photos picked; build posts with the first few.
  const [picked, setPicked] = useState<string[]>(() => {
    const fromMod = photos.filter((p) => p.fromMod).map((p) => p.id);
    return (fromMod.length ? fromMod : photos.map((p) => p.id)).slice(0, Math.min(6, maxPhotos));
  });

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : current.length < maxPhotos
          ? [...current, id]
          : current,
    );
  }

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-xl border border-graphite bg-panel p-6"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {modId && <input type="hidden" name="modId" value={modId} />}
      {picked.map((id) => (
        <input key={id} type="hidden" name="photoIds" value={id} />
      ))}

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
        <span className="text-steel">
          Photos ({picked.length} of up to {maxPhotos})
        </span>
        {photos.length === 0 ? (
          <p className="mt-1 text-xs text-steel">
            No photos yet. Add build or mod photos on the car&apos;s page, then share.
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
        <p className="mt-2 text-xs text-steel">
          Picked photos are copied to the public post. Receipts are never shared.
        </p>
      </div>

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
        {pending ? "Posting…" : "Post to community"}
      </button>
    </form>
  );
}
