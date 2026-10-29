import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getServiceRecord } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editServiceRecord } from "../../actions";
import { ServiceForm } from "../../new/service-form";

export const metadata: Metadata = { title: "Edit service · Revlog" };

type Props = PageProps<"/garage/[id]/service/[recordId]/edit">;

export default function EditServicePage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditService params={params} />
      </Suspense>
    </div>
  );
}

async function EditService({ params }: Pick<Props, "params">) {
  const { id, recordId } = await params;
  const user = await requireUser();
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();
  const record = await getServiceRecord(user.id, car.id, recordId);
  if (!record) notFound();

  return (
    <>
      <Link href={`/garage/${car.id}`} className="text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Edit service</h1>
      <ServiceForm
        action={editServiceRecord.bind(null, car.id, record.id)}
        currentMileage={car.currentMileage}
        customTypes={customTypes}
        submitLabel="Save changes"
        initial={{
          category: record.category,
          title: record.title,
          servicedOn: record.servicedOn,
          mileage: record.mileage?.toString() ?? "",
          cost: record.cost ?? "",
          shop: record.shop ?? "",
          notes: record.notes ?? "",
        }}
      />
    </>
  );
}
