"use client";

import { PhotoCredit } from "@/components/photo-credit";
import type { DemoCar } from "@/lib/demo-garage";

// Demo car photos come from Wikimedia Commons and are credited where shown.
export function DemoPhotoCredit({ car }: { car: DemoCar }) {
  return <PhotoCredit label={`${car.make} ${car.model}`} photo={car.photo} />;
}
