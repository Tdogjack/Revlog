import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editVehicle } from "../../actions";
import { VehicleForm } from "../../new/vehicle-form";

export const metadata: Metadata = { title: "Edit car · Revlog" };

type Props = PageProps<"/garage/[id]/edit">;

export default function EditVehiclePage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditVehicle params={params} />
      </Suspense>
    </div>
  );
}

async function EditVehicle({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();

  return (
    <>
      <Link href={`/garage/${car.id}`} className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Edit car</h1>
      <VehicleForm
        action={editVehicle.bind(null, car.id)}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        initial={{
          year: String(car.year),
          make: car.make,
          model: car.model,
          trim: car.trim ?? "",
          nickname: car.nickname ?? "",
          vin: car.vin ?? "",
          currentMileage: String(car.currentMileage),
          builtYear: car.builtOn?.slice(0, 4) ?? "",
          builtMonth: car.builtOn?.slice(5, 7) ?? "",
        }}
      />
    </>
  );
}
