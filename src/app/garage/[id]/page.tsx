import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bell, Wrench, Zap } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { signedPhotoUrls } from "@/lib/photos";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { PhotoControls } from "./photo-controls";

export default function VehiclePage({ params }: PageProps<"/garage/[id]">) {
  return (
    <>
      <Link href="/garage" className="text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading car…</p>}>
        <VehicleDetails params={params} />
      </Suspense>
    </>
  );
}

const sections = [
  { icon: Wrench, title: "Service history", empty: "No service records yet." },
  { icon: Zap, title: "Mods", empty: "No mods logged yet." },
  { icon: Bell, title: "Reminders", empty: "No reminders set." },
];

async function VehicleDetails({ params }: Pick<PageProps<"/garage/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();
  const photoUrl = car.photoPath ? (await signedPhotoUrls([car.photoPath])).get(car.photoPath) : null;

  return (
    <>
      <title>{`${car.nickname ?? vehicleName(car)} · Revlog`}</title>
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-graphite bg-panel p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-2">
          <VehiclePhoto src={photoUrl} alt={vehicleName(car)} className="h-28 w-28" />
          <PhotoControls vehicleId={car.id} hasPhoto={!!car.photoPath} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">{car.nickname ?? vehicleName(car)}</h1>
              {car.nickname && <p className="mt-1 text-steel">{vehicleName(car)}</p>}
            </div>
            <p className="font-mono text-sm text-steel">
              {car.currentMileage.toLocaleString("en-US")} mi
            </p>
          </div>
          {car.vin && <p className="mt-3 font-mono text-xs text-steel">VIN {car.vin}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {sections.map(({ icon: Icon, title, empty }) => (
          <section key={title} className="rounded-xl border border-graphite bg-panel p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 text-redline" aria-hidden />
              {title}
            </h2>
            <p className="mt-3 text-sm text-steel">{empty}</p>
          </section>
        ))}
      </div>
    </>
  );
}
