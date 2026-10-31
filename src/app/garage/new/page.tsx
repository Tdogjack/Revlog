import type { Metadata } from "next";
import Link from "next/link";
import { addVehicle } from "../actions";
import { VehicleForm } from "./vehicle-form";

export const metadata: Metadata = { title: "Add a car · Revlog" };

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/garage" className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Add a car</h1>
      <VehicleForm action={addVehicle} />
    </div>
  );
}
