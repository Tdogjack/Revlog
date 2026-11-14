import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CURRENT_CAR_COOKIE } from "@/lib/current-car";
import { listVehicles } from "@/lib/vehicles";

export const metadata: Metadata = { title: "Your garage · Revlog" };

// The garage opens straight onto a car: the one viewed last, or the first in
// the user's order. Switching cars happens on the car page itself.
export default async function GaragePage() {
  const user = await requireUser();
  const cars = await listVehicles(user.id);

  if (cars.length === 0) {
    return (
      <>
        <h1 className="font-display text-4xl font-semibold">Your garage</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-graphite px-6 py-12 text-center">
          <Car className="mx-auto h-8 w-8 text-steel" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold">Add your first car</h2>
          <p className="mt-1 text-sm text-steel">
            Start a timeline of every service and mod for it.
          </p>
          <Link href="/garage/new" className="btn btn-primary mt-6">
            Add a car
          </Link>
        </div>
      </>
    );
  }

  const last = (await cookies()).get(CURRENT_CAR_COOKIE)?.value;
  const car = cars.find((c) => c.id === last) ?? cars[0];
  redirect(`/garage/${car.id}`);
}
