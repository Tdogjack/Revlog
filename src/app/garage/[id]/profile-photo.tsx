"use client";

import { useState } from "react";
import { PhotoViewer } from "@/components/photo-strip";
import { VehiclePhoto } from "@/components/vehicle-photo";

// The car's main photo; click it to see it full size.
export function ProfilePhoto({ src, alt }: { src: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <VehiclePhoto src={null} alt={alt} className="h-28 w-28" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enlarge photo"
        className="rounded-lg transition-opacity hover:opacity-90"
      >
        <VehiclePhoto src={src} alt={alt} className="h-28 w-28" />
      </button>
      {open && (
        <PhotoViewer
          photos={[{ id: "profile", url: src }]}
          index={0}
          onIndex={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
