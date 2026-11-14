import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { suggestedIntervals } from "@/lib/service-plan";
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
      <BackLink href={`/garage/${car.id}/reminders`}>{car.nickname ?? vehicleName(car)}</BackLink>
      <h1 className="mt-4 font-display text-4xl font-semibold">Add a reminder</h1>
      <ReminderForm
        action={addReminder.bind(null, car.id)}
        customTypes={customTypes}
        suggested={suggestedIntervals(car)}
      />
    </>
  );
}
