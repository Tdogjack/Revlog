import Link from "next/link";
import { ArrowUpDown, Plus } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { signedThumbUrls } from "@/lib/photos";
import { listVehicles, vehicleName } from "@/lib/vehicles";
import { RememberCar } from "./remember-car";

const tileClass =
  "lift flex shrink-0 snap-start items-center gap-3 rounded-xl border p-1.5 pr-4 sm:w-48 sm:flex-col sm:items-stretch sm:gap-2 sm:p-2";

// The user's cars as a row of tiles above the open car, with the open one
// outlined in the accent and an Add tile at the end. One car is the common
// case, so the row stays short; more cars scroll sideways. On a phone the
// tiles shrink to a thumbnail and name so the car itself stays in view.
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
                  className="aspect-[4/3] w-14 rounded-lg sm:aspect-[16/9] sm:w-full"
                />
                <span className="max-w-36 min-w-0 sm:max-w-none sm:px-1 sm:pb-0.5">
                  <span
                    className={`block truncate text-sm font-semibold ${current ? "text-chalk" : "text-steel"}`}
                  >
                    {car.nickname ?? `${car.year} ${car.make}`}
                  </span>
                  <span className="block truncate text-xs text-steel">
                    {car.nickname ? vehicleName(car) : car.model}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <Link
            href="/garage/new"
            className={`${tileClass} justify-center border-dashed border-graphite pl-4 sm:items-center text-steel hover:border-steel hover:text-chalk`}
          >
            <Plus className="h-5 w-5 sm:self-center" aria-hidden />
            <span className="text-sm font-semibold sm:self-center">Add a car</span>
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
        <div key={i} className="skeleton h-[56px] w-48 shrink-0 sm:h-[150px]" />
      ))}
    </div>
  );
}
