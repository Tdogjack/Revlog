import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { PHOTO_LIMITS, signedPhotosFor } from "@/lib/gallery";
import { toPartRows } from "@/lib/part-rows";
import { listPartsForParent } from "@/lib/parts";
import { getServiceRecord } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editServiceRecord } from "../../actions";
import { ServiceForm } from "../../new/service-form";

export const metadata: Metadata = { title: "Edit service · Revlog" };

type Props = PageProps<"/garage/[id]/service/[recordId]/edit">;

export default function EditServicePage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditService params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditService({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id, recordId }, { photos: photoStatus }] = await Promise.all([params, searchParams]);
  const failed = photoStatus === "failed";
  const user = await requireUser();
  const photosLocked = !(await isEmailVerified(user.id));
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();
  const record = await getServiceRecord(user.id, car.id, recordId);
  if (!record) notFound();
  const [recordParts, recordPhotos] = await Promise.all([
    listPartsForParent(user.id, { serviceRecordId: record.id }),
    signedPhotosFor(user.id, car.id, { kind: "record", id: record.id }),
  ]);

  return (
    <>
      <Link href={`/garage/${car.id}`} className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Edit service</h1>
      {failed && (
        <p role="alert" className="mt-2 rounded-md bg-graphite px-3 py-2 text-sm">
          Saved, but some photos didn&apos;t upload. Add them again below.
        </p>
      )}
      <ServiceForm
        action={editServiceRecord.bind(null, car.id, record.id)}
        currentMileage={car.currentMileage}
        customTypes={customTypes}
        submitLabel="Save changes"
        initialParts={toPartRows(recordParts)}
        photos={{
          vehicleId: car.id,
          max: PHOTO_LIMITS.record,
          locked: photosLocked,
          target: { id: record.id, photos: recordPhotos },
        }}
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
