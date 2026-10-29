import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Log service · Revlog" };

export default function NewServicePage({ params }: PageProps<"/garage/[id]/service/new">) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <NewService params={params} />
      </Suspense>
    </div>
  );
}

async function NewService({ params }: Pick<PageProps<"/garage/[id]/service/new">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();

  return (
    <>
      <Link href={`/garage/${car.id}`} className="text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Log service</h1>
      <ServiceForm
        vehicleId={car.id}
        currentMileage={car.currentMileage}
        customTypes={customTypes}
      />
    </>
  );
}
