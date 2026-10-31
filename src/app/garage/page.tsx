import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, Car, Plus, Star } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/email-settings";
import { StatusBadge } from "@/components/status-badge";
import { signedPhotoUrls } from "@/lib/photos";
import { listAllReminders } from "@/lib/reminder-store";
import {
  evaluateReminder,
  STATUS_RANK,
  withCarAgeStart,
  withLastService,
  type ReminderStatus,
} from "@/lib/reminders";
import { listServiceDates } from "@/lib/service-records";
import { listVehicles, vehicleName } from "@/lib/vehicles";
import { reorderVehicle, toggleFavorite } from "./actions";

export const metadata: Metadata = { title: "Your garage · Revlog" };

export default function GaragePage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your garage</h1>
        <Link
          href="/garage/new"
          className="flex items-center gap-1.5 rounded-md bg-redline px-3 py-2 text-sm font-medium text-white hover:bg-redline-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a car
        </Link>
      </div>
      <Suspense fallback={<p className="mt-8 text-sm text-steel">Loading your cars…</p>}>
        <VehicleList />
      </Suspense>
    </>
  );
}

async function VehicleList() {
  const user = await requireUser();
  const cars = await listVehicles(user.id);
  const [photos, allReminders, serviceDates, settings] = await Promise.all([
    signedPhotoUrls(cars.map((c) => c.photoPath)),
    listAllReminders(user.id),
    listServiceDates(user.id),
    getEmailSettings(user.id),
  ]);
  const options = { dueSoonPercent: settings.reminderPercent };

  // The most urgent reminder status for each car, and how many share it.
  const urgency = new Map<string, { status: ReminderStatus; count: number }>();
  for (const car of cars) {
    for (const r of allReminders.filter((r) => r.vehicleId === car.id)) {
      const { status } = evaluateReminder(
        withCarAgeStart(withLastService(r, serviceDates), car),
        car.currentMileage,
        undefined,
        options,
      );
      const current = urgency.get(car.id);
      if (!current || STATUS_RANK[status] < STATUS_RANK[current.status]) {
        urgency.set(car.id, { status, count: 1 });
      } else if (status === current.status) {
        current.count++;
      }
    }
  }

  if (cars.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-graphite p-10 text-center">
        <Car className="mx-auto h-8 w-8 text-steel" aria-hidden />
        <h2 className="mt-4 font-medium">Add your first car</h2>
        <p className="mt-1 text-sm text-steel">Start a timeline of every service and mod for it.</p>
        <Link
          href="/garage/new"
          className="mt-5 inline-block rounded-md bg-redline px-4 py-2 text-sm font-medium text-white hover:bg-redline-hover"
        >
          Add a car
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car, i) => (
        <li key={car.id} className="relative">
          <Link
            href={`/garage/${car.id}`}
            className={`block rounded-xl border bg-panel p-5 pr-12 hover:border-steel ${car.favorite ? "border-redline/50" : "border-graphite"}`}
          >
            <div className="flex items-center gap-4">
              <VehiclePhoto
                src={car.photoPath ? photos.get(car.photoPath) : null}
                alt={vehicleName(car)}
                className="h-16 w-16"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{car.nickname ?? vehicleName(car)}</p>
                {car.nickname && (
                  <p className="mt-0.5 truncate text-sm text-steel">{vehicleName(car)}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="font-mono text-xs text-steel">
                {car.currentMileage.toLocaleString("en-US")} mi
              </p>
              {(() => {
                const u = urgency.get(car.id);
                if (!u) return null;
                if (u.status === "ok") return <StatusBadge status="ok" label="All caught up" />;
                const label = u.status === "overdue" ? "overdue" : "due soon";
                return <StatusBadge status={u.status} label={`${u.count} ${label}`} />;
              })()}
            </div>
          </Link>
          <CardControls
            vehicleId={car.id}
            favorite={car.favorite}
            canMoveUp={i > 0 && cars[i - 1].favorite === car.favorite}
            canMoveDown={i < cars.length - 1 && cars[i + 1].favorite === car.favorite}
          />
        </li>
      ))}
    </ul>
  );
}

// Favorite and reorder buttons, kept outside the card link so they don't open the car.
function CardControls({
  vehicleId,
  favorite,
  canMoveUp,
  canMoveDown,
}: {
  vehicleId: string;
  favorite: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const button = "rounded p-1 text-steel hover:bg-graphite hover:text-chalk";
  return (
    <div className="absolute top-3 right-3 flex flex-col items-center gap-0.5">
      <form action={toggleFavorite.bind(null, vehicleId, !favorite)}>
        <button
          type="submit"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={favorite}
          title={favorite ? "Favorite" : "Make favorite"}
          className={`${button} ${favorite ? "text-redline" : ""}`}
        >
          <Star className={`h-4 w-4 ${favorite ? "fill-redline" : ""}`} aria-hidden />
        </button>
      </form>
      {canMoveUp && (
        <form action={reorderVehicle.bind(null, vehicleId, "up")}>
          <button type="submit" aria-label="Move up" title="Move up" className={button}>
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
      {canMoveDown && (
        <form action={reorderVehicle.bind(null, vehicleId, "down")}>
          <button type="submit" aria-label="Move down" title="Move down" className={button}>
            <ArrowDown className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
