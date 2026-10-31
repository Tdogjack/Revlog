import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getMod } from "@/lib/mods";
import { toPartRows } from "@/lib/part-rows";
import { listPartsForParent } from "@/lib/parts";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editMod } from "../../actions";
import { ModForm } from "../../new/mod-form";

export const metadata: Metadata = { title: "Edit mod · Revlog" };

type Props = PageProps<"/garage/[id]/mods/[modId]/edit">;

export default function EditModPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditMod params={params} />
      </Suspense>
    </div>
  );
}

async function EditMod({ params }: Pick<Props, "params">) {
  const { id, modId } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();
  const mod = await getMod(user.id, car.id, modId);
  if (!mod) notFound();
  const modParts = await listPartsForParent(user.id, { modId: mod.id });

  return (
    <>
      <Link href={`/garage/${car.id}`} className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Edit mod</h1>
      <ModForm
        action={editMod.bind(null, car.id, mod.id)}
        currentMileage={car.currentMileage}
        submitLabel="Save changes"
        initialParts={toPartRows(modParts)}
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
