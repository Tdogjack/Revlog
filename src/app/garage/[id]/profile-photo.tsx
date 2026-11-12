"use client";

import { useState } from "react";
import { PhotoViewer } from "@/components/photo-strip";
import { VehiclePhoto } from "@/components/vehicle-photo";

// Landscape, since car photos are shot that way.
const size = "aspect-[4/3] w-full rounded-2xl! sm:w-80";

// The car's main photo, shown from its small copy; click it to see it full size.
export function ProfilePhoto({
  src,
  thumb,
  alt,
}: {
  src: string | null;
  thumb?: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  if (!src) return <VehiclePhoto src={null} alt={alt} className={size} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enlarge photo"
        title="Enlarge photo"
        className="lift block w-full rounded-2xl sm:w-auto"
      >
        <VehiclePhoto src={thumb ?? src} alt={alt} className={size} />
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
