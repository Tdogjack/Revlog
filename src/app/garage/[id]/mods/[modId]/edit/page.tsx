import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { PHOTO_LIMITS, signedPhotosFor } from "@/lib/gallery";
import { getMod } from "@/lib/mods";
import { toPartRows } from "@/lib/part-rows";
import { listPartsForParent } from "@/lib/parts";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editMod } from "../../actions";
import { ModForm } from "../../new/mod-form";

export const metadata: Metadata = { title: "Edit mod · Revlog" };

type Props = PageProps<"/garage/[id]/mods/[modId]/edit">;

export default function EditModPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditMod params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditMod({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id, modId }, { photos: photoStatus }] = await Promise.all([params, searchParams]);
  const failed = photoStatus === "failed";
  const user = await requireUser();
  const photosLocked = !(await isEmailVerified(user.id));
  const car = await getVehicle(user.id, id);
  if (!car) notFound();
  const mod = await getMod(user.id, car.id, modId);
  if (!mod) notFound();
  const [modParts, modPhotos] = await Promise.all([
    listPartsForParent(user.id, { modId: mod.id }),
    signedPhotosFor(user.id, car.id, { kind: "mod", id: mod.id }),
  ]);

  return (
    <>
      <BackLink href={`/garage/${car.id}`}>{car.nickname ?? vehicleName(car)}</BackLink>
      <h1 className="mt-4 font-display text-4xl font-semibold">Edit mod</h1>
      {failed && (
        <p role="alert" className="mt-2 rounded-md bg-graphite px-3 py-2 text-sm">
          Saved, but some photos didn&apos;t upload. Add them again below.
        </p>
      )}
      <ModForm
        action={editMod.bind(null, car.id, mod.id)}
        currentMileage={car.currentMileage}
        submitLabel="Save changes"
        initialParts={toPartRows(modParts)}
        photos={{
          vehicleId: car.id,
          max: PHOTO_LIMITS.mod,
          locked: photosLocked,
          target: { id: mod.id, photos: modPhotos },
        }}
        initial={{
          part: mod.part,
          brand: mod.brand ?? "",
          category: mod.category ?? "other",
          status: mod.status,
          cost: mod.cost ?? "",
          installedOn: mod.installedOn ?? "",
          installedMileage: mod.installedMileage?.toString() ?? "",
          notes: mod.notes ?? "",
        }}
      />
    </>
  );
}
