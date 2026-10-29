import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bell, Plus, Wrench, Zap } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { signedPhotoUrls } from "@/lib/photos";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { DeleteRecordButton } from "./delete-record-button";
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Stored as YYYY-MM-DD; format in UTC so the day never shifts.
function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function VehicleDetails({ params }: Pick<PageProps<"/garage/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();

  const [records, photos] = await Promise.all([
    listServiceRecords(user.id, car.id),
    signedPhotoUrls([car.photoPath]),
  ]);
  const photoUrl = car.photoPath ? photos.get(car.photoPath) : null;
  const totalSpent = records.reduce((sum, r) => sum + (r.cost ? Number(r.cost) : 0), 0);

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
        <section className="rounded-xl border border-graphite bg-panel p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-medium">
              <Wrench className="h-4 w-4 text-redline" aria-hidden />
              Service history
            </h2>
            <Link
              href={`/garage/${car.id}/service/new`}
              className="flex items-center gap-1 rounded-md bg-redline px-3 py-1.5 text-sm font-medium text-white hover:bg-redline-hover"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Log service
            </Link>
          </div>

          {records.length === 0 ? (
            <p className="mt-4 text-sm text-steel">
              No service records yet. Log your last oil change to start the timeline.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-steel">
                {records.length} {records.length === 1 ? "record" : "records"}
                {totalSpent > 0 && ` · ${money.format(totalSpent)} spent`}
              </p>
              <ol className="mt-4">
                {records.map((r) => (
                  <li key={r.id} className="flex gap-4 border-t border-graphite py-4">
                    <div className="w-24 shrink-0 font-mono text-xs text-steel">
                      {formatDate(r.servicedOn)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.title}</p>
                        <span className="rounded bg-graphite px-2 py-0.5 text-xs">
                          {categoryLabel(r.category)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-steel">
                        {[
                          r.mileage != null && `${r.mileage.toLocaleString("en-US")} mi`,
                          r.cost != null && money.format(Number(r.cost)),
                          r.shop,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
                    </div>
                    <DeleteRecordButton vehicleId={car.id} recordId={r.id} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-graphite bg-panel p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <Zap className="h-4 w-4 text-redline" aria-hidden />
              Mods
            </h2>
            <p className="mt-3 text-sm text-steel">No mods logged yet.</p>
          </section>
          <section className="rounded-xl border border-graphite bg-panel p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <Bell className="h-4 w-4 text-redline" aria-hidden />
              Reminders
            </h2>
            <p className="mt-3 text-sm text-steel">No reminders set.</p>
          </section>
        </div>
      </div>
    </>
  );
}
