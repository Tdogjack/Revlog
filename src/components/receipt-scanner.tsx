"use client";

import { useRef, useState } from "react";
import { LoaderCircle, ScanText } from "lucide-react";
import { useAiConsent } from "@/components/ai-consent";
import { editPhotos } from "@/components/photo-editor";
import { PHOTO_ACCEPT, resizeImage } from "@/lib/resize-image";

// "Scan" box at the top of the service and mod forms. Sends the photo to
// `scan` to be read, then hands the values and the resized photo back to
// the form, which fills in its fields for the user to check.
export function ReceiptScanner<T>({
  scan,
  intro,
  label,
  onScanned,
}: {
  scan: (formData: FormData) => Promise<{ data: T } | { error: string }>;
  intro: string;
  label: string;
  onScanned: (data: T, photo: File) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const consent = useAiConsent();

  async function read(chosen: File) {
    setError(null);
    setDone(false);
    try {
      // Cropping to just the receipt helps the scan read it.
      const [file] = (await editPhotos([chosen], { done: "Scan photo" })) ?? [];
      if (!file) return;
      if (!(await consent.ensure())) return;
      setScanning(true);
      const photo = await resizeImage(file, 1600);
      const fd = new FormData();
      fd.set("photo", photo);
      const result = await scan(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        onScanned(result.data, photo);
        setDone(true);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "That photo couldn't be read right now. Try again, or fill it in by hand.",
      );
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-md border border-graphite bg-carbon p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm text-steel">{intro}</p>
          <p className="field-hint">Scans are read by Anthropic&apos;s AI.</p>
        </div>
        <label
          className={`btn has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-redline ${
            scanning ? "cursor-default opacity-60" : "cursor-pointer"
          }`}
          aria-busy={scanning}
        >
          {scanning ? (
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <ScanText className="h-4 w-4" aria-hidden />
          )}
          {scanning ? "Reading photo…" : label}
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            disabled={scanning}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) read(file);
            }}
          />
        </label>
      </div>
      <div aria-live="polite">
        {done && (
          <p className="mt-2 text-sm text-done">
            Filled in from the photo and added it to the photos. Check each field before saving.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-overdue">
          {error}
        </p>
      )}
      {consent.dialog}
    </div>
  );
}
