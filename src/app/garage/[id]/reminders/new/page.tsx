import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { addReminder } from "../actions";
import { ReminderForm } from "./reminder-form";

export const metadata: Metadata = { title: "Add a reminder · Revlog" };

export default function NewReminderPage({ params }: PageProps<"/garage/[id]/reminders/new">) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <NewReminder params={params} />
      </Suspense>
    </div>
  );
}

async function NewReminder({ params }: Pick<PageProps<"/garage/[id]/reminders/new">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();

  return (
    <>
      <Link href={`/garage/${car.id}`} className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Add a reminder</h1>
      <ReminderForm action={addReminder.bind(null, car.id)} customTypes={customTypes} />
    </>
  );
}
