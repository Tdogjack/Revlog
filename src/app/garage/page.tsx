import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Pencil, Plus, Star } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/email-settings";
import { MileageChart } from "@/components/mileage-chart";
import { StatusBadge } from "@/components/status-badge";
import { buildMileageTimeline } from "@/lib/mileage-timeline";
import { listModInstalls } from "@/lib/mods";
import { signedPhotoUrls, signedThumbUrls } from "@/lib/photos";
import { listAllReminders } from "@/lib/reminder-store";
import { carUrgency, rankReminders } from "@/lib/reminders";
import { listServiceDates } from "@/lib/service-records";
import { listMileageReadings, listVehicles, vehicleName } from "@/lib/vehicles";
import { toggleFavorite } from "./actions";
import { SortableCars } from "./sortable-cars";

export const metadata: Metadata = { title: "Your garage · Revlog" };

export default function GaragePage() {
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight font-semibold">Your garage</h1>
        <Link href="/garage/new" className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          Add a car
        </Link>
      </div>
      <Suspense fallback={<GarageSkeleton />}>
        <VehicleList />
      </Suspense>
    </>
  );
}

async function VehicleList() {
  const user = await requireUser();
  const cars = await listVehicles(user.id);
  const [fullPhotos, thumbs, allReminders, serviceDates, settings, modInstalls, readings] =
    await Promise.all([
      signedPhotoUrls(cars.map((c) => c.photoPath)),
      // Cards show the small copy of each car's photo.
      signedThumbUrls(cars.map((c) => c.photoPath)),
      listAllReminders(user.id),
      listServiceDates(user.id),
      getEmailSettings(user.id),
      listModInstalls(user.id),
      listMileageReadings(user.id),
    ]);
  const photos = new Map([...fullPhotos].map(([path, url]) => [path, thumbs.get(path) ?? url]));
  const options = { dueSoonPercent: settings.reminderPercent };

  // The most urgent reminder status for each car, and how many share it.
  const urgency = new Map(
    cars.map((car) => [
      car.id,
      carUrgency(
        rankReminders(
          allReminders.filter((r) => r.vehicleId === car.id),
          car,
          serviceDates,
          options,
        ),
      ),
    ]),
  );

  // A small odometer trace for each car with enough history to draw one.
  const timelines = new Map(
    cars.map((car) => [
      car.id,
      buildMileageTimeline(
        [
          ...readings
            .filter((r) => r.vehicleId === car.id)
            .map((r) => ({
              key: `reading-${r.readOn}`,
              kind: "reading" as const,
              date: r.readOn,
              mileage: r.mileage,
              label: "Odometer updated",
            })),
          ...serviceDates
            .filter((r) => r.vehicleId === car.id)
            .map((r) => ({
              key: `service-${r.id}`,
              kind: "service" as const,
              date: r.servicedOn,
              mileage: r.mileage,
              label: r.title,
              href: `/garage/${car.id}/service/${r.id}/edit`,
            })),
          ...modInstalls
            .filter((m) => m.vehicleId === car.id)
            .map((m) => ({
              key: `mod-${m.id}`,
              kind: "mod" as const,
              date: m.installedOn!,
              mileage: m.installedMileage,
              label: m.brand ? `${m.brand} ${m.part}` : m.part,
              href: `/garage/${car.id}/mods/${m.id}/edit`,
            })),
        ],
        car.currentMileage,
      ),
    ]),
  );

  if (cars.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-graphite px-6 py-12 text-center">
        <Car className="mx-auto h-8 w-8 text-steel" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold">Add your first car</h2>
        <p className="mt-1 text-sm text-steel">Start a timeline of every service and mod for it.</p>
        <Link href="/garage/new" className="btn btn-primary mt-6">
          Add a car
        </Link>
      </div>
    );
  }

  return (
    <SortableCars
      cars={cars.map((car) => ({
        id: car.id,
        name: car.nickname ?? vehicleName(car),
        favorite: car.favorite,
        controls: <CardControls vehicleId={car.id} favorite={car.favorite} />,
        card: (
          <Link
            href={`/garage/${car.id}`}
            className="group flex gap-4 rounded-lg border border-graphite bg-panel p-3 pr-14 transition-colors hover:border-steel sm:gap-6 sm:pr-16"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6 lg:flex-none">
              <VehiclePhoto
                src={car.photoPath ? photos.get(car.photoPath) : null}
                alt={vehicleName(car)}
                className="aspect-[4/3] w-28 shrink-0 rounded-md sm:w-56"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center py-1 lg:w-56 lg:flex-none">
                <p className="line-clamp-2 font-display text-2xl leading-tight font-semibold sm:text-3xl">
                  {car.nickname ?? vehicleName(car)}
                </p>
                {car.nickname && (
                  <p className="mt-0.5 truncate text-sm text-steel">{vehicleName(car)}</p>
                )}
                <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <p className="text-steel">
                    <span className="readout text-xl text-chalk">
                      {car.currentMileage.toLocaleString("en-US")}
                    </span>{" "}
                    <span className="text-xs">mi</span>
                  </p>
                  {(() => {
                    const u = urgency.get(car.id);
                    if (!u) return null;
                    if (u.status === "ok") return <StatusBadge status="ok" label="All caught up" />;
                    const label =
                      u.status === "overdue"
                        ? "overdue"
                        : u.status === "unknown"
                          ? "not logged"
                          : "due soon";
                    return <StatusBadge status={u.status} label={`${u.count} ${label}`} />;
                  })()}
                </div>
              </div>
            </div>
            {(() => {
              const timeline = timelines.get(car.id);
              if (!timeline) return null;
              return (
                <div className="hidden min-w-0 flex-1 border-l border-rule py-1 pl-6 lg:block">
                  <MileageChart timeline={timeline} compact />
                </div>
              );
            })()}
          </Link>
        ),
      }))}
    />
  );
}

// Favorite and edit buttons, kept outside the card link so they don't open the
// car. The drag grip for reordering sits under them.
function CardControls({ vehicleId, favorite }: { vehicleId: string; favorite: boolean }) {
  const button = "icon-btn";
  return (
    <>
      <form action={toggleFavorite.bind(null, vehicleId, !favorite)}>
        <button
          type="submit"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={favorite}
          title={favorite ? "Favorite" : "Make favorite"}
          className={`${button} ${favorite ? "text-redline hover:text-redline" : ""}`}
        >
          <Star className={`h-4 w-4 ${favorite ? "fill-redline" : ""}`} aria-hidden />
        </button>
      </form>
      <Link
        href={`/garage/${vehicleId}/edit`}
        aria-label="Edit car"
        title="Edit car"
        className={button}
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
    </>
  );
}

// Placeholder rows while the cars load, sized like the real list.
function GarageSkeleton() {
  return (
    <ul className="mt-8 space-y-3" aria-busy="true" aria-label="Loading your cars">
      {[0, 1].map((i) => (
        <li key={i} className="skeleton h-[108px] sm:h-[192px]" />
      ))}
    </ul>
  );
}
