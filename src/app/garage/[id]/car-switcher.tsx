import Link from "next/link";
import { ArrowUpDown, Plus } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { signedThumbUrls } from "@/lib/photos";
import { listVehicles, vehicleName } from "@/lib/vehicles";
import { RememberCar } from "./remember-car";

const tileClass =
  "lift flex min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-xl border py-1.5 pr-4 pl-1.5";

// The user's cars as a row of compact chips above the open car: a small
// thumbnail and the name, the open one outlined in the accent, and an Add chip
// at the end. More cars scroll sideways.
export async function CarSwitcher({ currentId }: { currentId: string }) {
  const user = await requireUser();
  const cars = await listVehicles(user.id);
  const thumbs = await signedThumbUrls(cars.map((c) => c.photoPath));

  return (
    <nav aria-label="Your cars" className="-mx-4 sm:-mx-6">
      <RememberCar id={currentId} />
      <ul className="flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:gap-3 sm:px-6">
        {cars.map((car) => {
          const current = car.id === currentId;
          return (
            <li key={car.id} className="flex">
              <Link
                href={`/garage/${car.id}`}
                aria-current={current ? "page" : undefined}
                className={`${tileClass} ${
                  current
                    ? "border-redline bg-panel"
                    : "border-graphite bg-panel/60 hover:border-steel"
                }`}
              >
                <VehiclePhoto
                  src={car.photoPath ? thumbs.get(car.photoPath) : null}
                  alt=""
                  className="h-8 w-11 rounded-lg"
                />
                <span
                  className={`max-w-40 truncate text-sm font-semibold ${current ? "text-chalk" : "text-steel"}`}
                  title={vehicleName(car)}
                >
                  {car.nickname ?? `${car.year} ${car.make} ${car.model}`}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <Link
            href="/garage/new"
            className={`${tileClass} border-dashed border-graphite pl-3 text-steel hover:border-steel hover:text-chalk`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="text-sm font-semibold">Add a car</span>
          </Link>
        </li>
        {cars.length > 1 && (
          <li className="flex items-center">
            <Link href="/garage/cars" className="nav-link shrink-0 gap-1.5">
              <ArrowUpDown className="h-4 w-4" aria-hidden />
              Reorder cars
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

// Same footprint as the real row, so the car below doesn't jump.
export function CarSwitcherSkeleton() {
  return (
    <div className="flex gap-3" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="skeleton h-11 w-36 shrink-0 rounded-xl" />
      ))}
    </div>
  );
}
