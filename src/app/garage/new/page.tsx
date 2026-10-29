import type { Metadata } from "next";
import Link from "next/link";
import { VehicleForm } from "./vehicle-form";

export const metadata: Metadata = { title: "Add a car · Revlog" };

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/garage" className="text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Add a car</h1>
      <VehicleForm />
    </div>
  );
}
