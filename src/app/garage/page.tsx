import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Plus } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { signedPhotoUrls } from "@/lib/photos";
import { listVehicles, vehicleName } from "@/lib/vehicles";

export const metadata: Metadata = { title: "Your garage · Revlog" };

export default function GaragePage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your garage</h1>
        <Link
          href="/garage/new"
          className="flex items-center gap-1.5 rounded-md bg-redline px-3 py-2 text-sm font-medium text-white hover:bg-redline-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a car
        </Link>
      </div>
      <Suspense fallback={<p className="mt-8 text-sm text-steel">Loading your cars…</p>}>
        <VehicleList />
      </Suspense>
    </>
  );
}

async function VehicleList() {
  const user = await requireUser();
  const cars = await listVehicles(user.id);
  const photos = await signedPhotoUrls(cars.map((c) => c.photoPath));

  if (cars.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-graphite p-10 text-center">
        <Car className="mx-auto h-8 w-8 text-steel" aria-hidden />
        <h2 className="mt-4 font-medium">Add your first car</h2>
        <p className="mt-1 text-sm text-steel">Start a timeline of every service and mod for it.</p>
        <Link
          href="/garage/new"
          className="mt-5 inline-block rounded-md bg-redline px-4 py-2 text-sm font-medium text-white hover:bg-redline-hover"
        >
          Add a car
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <li key={car.id}>
          <Link
            href={`/garage/${car.id}`}
            className="block rounded-xl border border-graphite bg-panel p-5 hover:border-steel"
          >
            <div className="flex items-center gap-4">
              <VehiclePhoto
                src={car.photoPath ? photos.get(car.photoPath) : null}
                alt={vehicleName(car)}
                className="h-16 w-16"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{car.nickname ?? vehicleName(car)}</p>
                {car.nickname && <p className="mt-0.5 truncate text-sm text-steel">{vehicleName(car)}</p>}
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-steel">
              {car.currentMileage.toLocaleString("en-US")} mi
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
