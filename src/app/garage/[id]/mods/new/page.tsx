import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { PHOTO_LIMITS } from "@/lib/gallery";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { addMod } from "../actions";
import { ModForm } from "./mod-form";

export const metadata: Metadata = { title: "Add a mod · Revlog" };

export default function NewModPage({ params }: PageProps<"/garage/[id]/mods/new">) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <NewMod params={params} />
      </Suspense>
    </div>
  );
}

async function NewMod({ params }: Pick<PageProps<"/garage/[id]/mods/new">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();

  return (
    <>
      <Link href={`/garage/${car.id}`} className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Add a mod</h1>
      <ModForm
        action={addMod.bind(null, car.id)}
        currentMileage={car.currentMileage}
        photos={{ vehicleId: car.id, max: PHOTO_LIMITS.mod }}
      />
    </>
  );
}
