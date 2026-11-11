"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { toBrowserImage } from "@/lib/resize-image";

// Crop and rotate photos before they're added. Any photo input calls
// `editPhotos(files)`; the editor opens over the page and resolves with the
// edited files, or null if the person cancels. Untouched photos come back as
// they were.

type Box = { x: number; y: number; w: number; h: number };
type Request = {
  files: File[];
  done?: string;
  resolve: (files: File[] | null) => void;
};

const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.08;
const ASPECTS = [
  { label: "Free", value: null },
  { label: "4:3", value: 4 / 3 },
  { label: "Square", value: 1 },
] as const;

let show: ((request: Request) => void) | null = null;

export function editPhotos(files: File[], options: { done?: string } = {}) {
  if (files.length === 0) return Promise.resolve<File[] | null>([]);
  const open = show;
  // Without the editor on the page, photos go through as they are.
  if (!open) return Promise.resolve<File[] | null>(files);
  return new Promise<File[] | null>((resolve) => open({ files, done: options.done, resolve }));
}

// Loads a photo that's already saved, so it can be edited and saved again.
export async function photoFromUrl(url: string, name = "photo.jpg") {
  const response = await fetch(url);
  if (!response.ok) throw new Error("That photo couldn't be loaded. Try again.");
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

// Mounted once in the root layout.
export function PhotoEditorHost() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    show = setRequest;
    return () => {
      show = null;
    };
  }, []);
  if (!request) return null;
  return (
    <Editor
      key={request.files.map((f) => `${f.name}-${f.lastModified}`).join("|")}
      request={request}
      onFinish={(files) => {
        request.resolve(files);
        setRequest(null);
      }}
    />
  );
}

type Item = {
  source: ImageBitmap | null;
  name: string;
  original: File;
  rotation: number;
  box: Box;
  url: string | null;
  width: number;
  height: number;
  error: string | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const edited = (item: Item) =>
  item.rotation % 360 !== 0 ||
  item.box.x > 0.001 ||
  item.box.y > 0.001 ||
  item.box.w < 0.999 ||
  item.box.h < 0.999;

// Draws the photo turned by `rotation` degrees (a multiple of 90).
function rotated(source: ImageBitmap, rotation: number) {
  const turns = ((rotation / 90) % 4 + 4) % 4;
  const sideways = turns % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? source.height : source.width;
  canvas.height = sideways ? source.width : source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));

async function render(item: Item): Promise<File> {
  if (!item.source || !edited(item)) return item.original;
  const turned = rotated(item.source, item.rotation);
  const sx = Math.round(item.box.x * turned.width);
  const sy = Math.round(item.box.y * turned.height);
  const sw = Math.max(1, Math.round(item.box.w * turned.width));
  const sh = Math.max(1, Math.round(item.box.h * turned.height));
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  out.getContext("2d")!.drawImage(turned, sx, sy, sw, sh, 0, 0, sw, sh);
  const blob = await toBlob(out);
  if (!blob) return item.original;
  const name = item.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// The biggest box of this shape that fits, centered.
function fitAspect(aspect: number | null, width: number, height: number): Box {
  if (!aspect) return FULL;
  const imageAspect = width / height;
  if (imageAspect > aspect) {
    const w = aspect / imageAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = imageAspect / aspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

function Editor({
  request,
  onFinish,
}: {
  request: Request;
  onFinish: (files: File[] | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>(() =>
    request.files.map((file) => ({
      source: null,
      name: file.name,
      original: file,
      rotation: 0,
      box: FULL,
      url: null,
      width: 0,
      height: 0,
      error: null,
    })),
  );
  const [current, setCurrent] = useState(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{
    mode: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    box: Box;
  } | null>(null);
  const item = items[current];
  const many = items.length > 1;

  useEffect(() => {
    const el = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => opener?.focus?.();
  }, []);

  // Read each photo once (HEIC is converted first) and show it.
  useEffect(() => {
    let cancelled = false;
    request.files.forEach(async (file, i) => {
      try {
        const readable = await toBrowserImage(file);
        const source = await createImageBitmap(readable, { imageOrientation: "from-image" });
        if (cancelled) return source.close();
        const url = URL.createObjectURL(readable);
        setItems((all) =>
          all.map((it, j) =>
            j === i
              ? { ...it, source, original: readable, url, width: source.width, height: source.height }
              : it,
          ),
        );
      } catch {
        if (cancelled) return;
        setItems((all) =>
          all.map((it, j) =>
            j === i ? { ...it, error: "This photo couldn't be read. It'll be added as it is." } : it,
          ),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [request.files]);

  // Release previews and decoded photos when the editor closes.
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  useEffect(
    () => () =>
      latest.current.forEach((it) => {
        if (it.url) URL.revokeObjectURL(it.url);
        it.source?.close();
      }),
    [],
  );

  const update = (patch: Partial<Item>) =>
    setItems((all) => all.map((it, j) => (j === current ? { ...it, ...patch } : it)));

  async function rotate(step: number) {
    if (!item.source) return;
    const rotation = item.rotation + step;
    const turned = rotated(item.source, rotation);
    const blob = await toBlob(turned);
    if (!blob) return;
    if (item.url) URL.revokeObjectURL(item.url);
    update({
      rotation,
      url: URL.createObjectURL(blob),
      width: turned.width,
      height: turned.height,
      box: fitAspect(aspect, turned.width, turned.height),
    });
  }

  function chooseAspect(value: number | null) {
    setAspect(value);
    if (item.width) update({ box: fitAspect(value, item.width, item.height) });
  }

  function reset() {
    if (!item.source) return;
    if (item.url) URL.revokeObjectURL(item.url);
    update({
      rotation: 0,
      url: URL.createObjectURL(item.original),
      width: item.source.width,
      height: item.source.height,
      box: FULL,
    });
    setAspect(null);
  }

  // Moves the box, or one corner of it, by (dx, dy) in fractions of the photo.
  function moved(mode: NonNullable<typeof drag.current>["mode"], start: Box, dx: number, dy: number) {
    if (mode === "move") {
      return {
        ...start,
        x: clamp(start.x + dx, 0, 1 - start.w),
        y: clamp(start.y + dy, 0, 1 - start.h),
      };
    }
    const right = start.x + start.w;
    const bottom = start.y + start.h;
    let left = mode === "nw" || mode === "sw" ? clamp(start.x + dx, 0, right - MIN) : start.x;
    let top = mode === "nw" || mode === "ne" ? clamp(start.y + dy, 0, bottom - MIN) : start.y;
    let r = mode === "ne" || mode === "se" ? clamp(right + dx, left + MIN, 1) : right;
    let b = mode === "sw" || mode === "se" ? clamp(bottom + dy, top + MIN, 1) : bottom;
    if (aspect && item.width) {
      // Keep the shape: height follows width, within the photo.
      const ratio = (aspect * item.height) / item.width;
      let w = r - left;
      let h = w / ratio;
      const maxH = mode === "nw" || mode === "ne" ? bottom : 1 - top;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      if (mode === "nw" || mode === "sw") left = r - w;
      else r = left + w;
      if (mode === "nw" || mode === "ne") top = b - h;
      else b = top + h;
    }
    return { x: left, y: top, w: r - left, h: b - top };
  }

  function onPointerDown(mode: NonNullable<typeof drag.current>["mode"], e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, box: item.box };
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    const rect = frame.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    update({ box: moved(d.mode, d.box, dx, dy) });
  }

  function onKey(mode: NonNullable<typeof drag.current>["mode"], e: KeyboardEvent) {
    const step = e.shiftKey ? 0.05 : 0.01;
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = keys[e.key];
    if (!delta) return;
    e.preventDefault();
    update({ box: moved(mode, item.box, delta[0], delta[1]) });
  }

  async function finish() {
    setSaving(true);
    const files = await Promise.all(items.map(render));
    onFinish(files);
  }

  const doneLabel =
    request.done ?? (many ? `Add ${items.length} photos` : "Use photo");
  const box = item.box;
  const corners = [
    { mode: "nw", style: { left: 0, top: 0 }, label: "top left" },
    { mode: "ne", style: { right: 0, top: 0 }, label: "top right" },
    { mode: "sw", style: { left: 0, bottom: 0 }, label: "bottom left" },
    { mode: "se", style: { right: 0, bottom: 0 }, label: "bottom right" },
  ] as const;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="photo-editor-title"
      onCancel={(e) => {
        e.preventDefault();
        onFinish(null);
      }}
      className="m-auto w-[min(100vw-1rem,56rem)] max-w-none rounded-lg border border-graphite bg-panel p-0 text-chalk backdrop:bg-black/80"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-graphite px-4 py-3">
          <h2 id="photo-editor-title" className="font-display text-xl font-semibold">
            {many ? `Edit photos (${current + 1} of ${items.length})` : "Edit photo"}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="icon-btn"
              aria-label="Rotate left"
              title="Rotate left"
              disabled={!item.source}
              onClick={() => rotate(-90)}
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Rotate right"
              title="Rotate right"
              disabled={!item.source}
              onClick={() => rotate(90)}
            >
              <RotateCw className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div
          className="flex min-h-0 flex-1 items-center justify-center bg-carbon p-4"
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {item.error ? (
            <p className="text-sm text-steel">{item.error}</p>
          ) : !item.url ? (
            <div className="skeleton h-64 w-full max-w-md" aria-label="Loading photo" />
          ) : (
            <div ref={frame} className="relative inline-block touch-none overflow-hidden select-none">
              {/* A local preview, so Next's image optimizer doesn't apply. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt=""
                draggable={false}
                className="block max-h-[min(60dvh,36rem)] max-w-full"
              />
              <div
                role="group"
                aria-label="Crop area. Drag to move, or use the arrow keys."
                tabIndex={0}
                onPointerDown={(e) => onPointerDown("move", e)}
                onKeyDown={(e) => onKey("move", e)}
                className="absolute cursor-move outline-none focus-visible:ring-2 focus-visible:ring-redline"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
                  border: "1px solid rgb(255 255 255 / 0.9)",
                }}
              >
                {/* Thirds, to help line things up. */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className="border border-white/20" />
                  ))}
                </div>
                {corners.map((c) => (
                  <button
                    key={c.mode}
                    type="button"
                    aria-label={`Resize from the ${c.label} corner. Use the arrow keys.`}
                    onPointerDown={(e) => onPointerDown(c.mode, e)}
                    onKeyDown={(e) => onKey(c.mode, e)}
                    className="absolute flex h-11 w-11 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-redline"
                    style={{
                      ...c.style,
                      transform: `translate(${"left" in c.style ? "-50%" : "50%"}, ${"top" in c.style ? "-50%" : "50%"})`,
                      cursor: c.mode === "nw" || c.mode === "se" ? "nwse-resize" : "nesw-resize",
                    }}
                  >
                    <span className="h-3.5 w-3.5 rounded-sm border-2 border-carbon bg-white" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-graphite px-4 py-3">
          <fieldset className="flex items-center gap-2" disabled={!item.source}>
            <legend className="sr-only">Crop shape</legend>
            {ASPECTS.map((a) => (
              <label key={a.label} className="choice min-h-9 px-3">
                <input
                  type="radio"
                  name="photo-editor-aspect"
                  className="sr-only"
                  checked={aspect === a.value}
                  onChange={() => chooseAspect(a.value)}
                />
                {a.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn"
            disabled={!item.source || !edited(item)}
            onClick={reset}
          >
            Reset
          </button>
        </div>

        {many && (
          <div className="flex gap-2 overflow-x-auto border-t border-graphite px-4 py-3">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Photo ${i + 1}${edited(it) ? ", edited" : ""}`}
                aria-current={i === current}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === current ? "border-redline" : "border-graphite"}`}
              >
                {it.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                )}
                {edited(it) && (
                  <span className="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-redline" />
                )}
              </button>
            ))}
          </div>
        )}

        <footer className="flex justify-end gap-2 border-t border-graphite px-4 py-3">
          <button type="button" className="btn" onClick={() => onFinish(null)} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={finish} disabled={saving}>
            {saving ? "Saving…" : doneLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
