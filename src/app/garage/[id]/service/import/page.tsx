import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { recordMatchKey } from "@/lib/history-draft";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Add service history · Revlog" };

type Props = PageProps<"/garage/[id]/service/import">;

export default function ImportHistoryPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<ImportSkeleton />}>
        <ImportHistory params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function ImportSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton h-5 w-32" />
      <div className="skeleton mt-4 h-10 w-72" />
      <div className="skeleton mt-6 h-40" />
      <div className="skeleton mt-5 h-64" />
    </div>
  );
}

async function ImportHistory({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, { new: justAdded }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const [car, customTypes, canScan] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
    isEmailVerified(user.id),
  ]);
  if (!car) notFound();
  const records = await listServiceRecords(user.id, car.id);
  const isNewCar = justAdded === "1";
  const name = car.nickname ?? vehicleName(car);

  return (
    <>
      <BackLink href={`/garage/${car.id}/service`}>{name}</BackLink>
      <h1 className="mt-4 font-display text-4xl font-semibold">
        {isNewCar ? `${name} is in the garage` : "Add service history"}
      </h1>
      <p className="mt-2 text-steel">
        {isNewCar
          ? "Bring in its past services now so your reminders start from the real history."
          : "Bring in past services all at once."}{" "}
        Nothing is saved until you&apos;ve checked the list.
      </p>
      <ImportFlow
        vehicleId={car.id}
        currentMileage={car.currentMileage}
        customTypes={customTypes}
        existing={records.map((r) => recordMatchKey(r, customTypes))}
        canScan={canScan}
        skipLabel={isNewCar ? "Skip for now" : "Cancel"}
      />
    </>
  );
}
