import Link from "next/link";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CarSwitcher, CarSwitcherSkeleton } from "../car-switcher";
import { MileageEditor } from "../reminder-controls";
import { CarTabs } from "./car-tabs";

// Every car tab shares the car row, the car's name and odometer, and the
// tabs. Each tab below loads on its own.
export default function CarLayout({ children, params }: LayoutProps<"/garage/[id]">) {
  return (
    <>
      <Suspense fallback={<CarSwitcherSkeleton />}>
        <Switcher params={params} />
      </Suspense>
      <Suspense fallback={<HeaderSkeleton />}>
        <CarHeader params={params} />
      </Suspense>
      <CarTabs />
      <div className="mt-8">{children}</div>
    </>
  );
}

async function Switcher({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CarSwitcher currentId={id} />;
}

async function CarHeader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();
  const name = car.nickname ?? vehicleName(car);

  return (
    <header className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <title>{`${name} · Revlog`}</title>
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">{name}</h1>
        {car.nickname && <p className="mt-1 text-steel">{vehicleName(car)}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <MileageEditor vehicleId={car.id} currentMileage={car.currentMileage} />
        <Link href={`/garage/${car.id}/edit`} className="btn">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit car
        </Link>
      </div>
    </header>
  );
}

function HeaderSkeleton() {
  return (
    <div className="mt-8 flex items-end justify-between gap-6" aria-hidden>
      <div className="skeleton h-12 w-2/3 max-w-md" />
      <div className="skeleton h-10 w-40" />
    </div>
  );
}
