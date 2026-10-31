"use client";

import { useState } from "react";
import { PhotoViewer } from "@/components/photo-strip";
import { VehiclePhoto } from "@/components/vehicle-photo";

// Landscape, since car photos are shot that way.
const size = "aspect-[4/3] w-full sm:w-80";

// The car's main photo; click it to see it full size.
export function ProfilePhoto({ src, alt }: { src: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <VehiclePhoto src={null} alt={alt} className={size} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enlarge photo"
        title="Enlarge photo"
        className="block w-full rounded-lg transition-opacity hover:opacity-90 sm:w-auto"
      >
        <VehiclePhoto src={src} alt={alt} className={size} />
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
