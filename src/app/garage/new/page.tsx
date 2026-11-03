import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { addVehicle } from "../actions";
import { VehicleForm } from "./vehicle-form";

export const metadata: Metadata = { title: "Add a car · Revlog" };

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/garage" className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-tight font-semibold">Add a car</h1>
      <Suspense fallback={null}>
        <NewVehicleForm />
      </Suspense>
    </div>
  );
}

async function NewVehicleForm() {
  const user = await requireUser();
  return <VehicleForm action={addVehicle} canUpload={await isEmailVerified(user.id)} />;
}
