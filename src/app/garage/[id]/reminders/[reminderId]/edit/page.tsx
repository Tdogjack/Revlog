import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getReminder } from "@/lib/reminder-store";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { editReminder } from "../../actions";
import { ReminderForm } from "../../new/reminder-form";

export const metadata: Metadata = { title: "Edit reminder · Revlog" };

type Props = PageProps<"/garage/[id]/reminders/[reminderId]/edit">;

export default function EditReminderPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <EditReminder params={params} />
      </Suspense>
    </div>
  );
}

async function EditReminder({ params }: Pick<Props, "params">) {
  const { id, reminderId } = await params;
  const user = await requireUser();
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();
  const reminder = await getReminder(user.id, car.id, reminderId);
  if (!reminder) notFound();

  const category = reminder.serviceCategory ?? "other";
  // A name that just matches the type is left blank, so it follows the type if that changes.
  const task = reminder.task === categoryLabel(category, customTypes) ? "" : reminder.task;

  return (
    <>
      <Link href={`/garage/${car.id}`} className="text-sm text-steel hover:text-chalk">
        ← Back to {car.nickname ?? vehicleName(car)}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Edit reminder</h1>
      <ReminderForm
        action={editReminder.bind(null, car.id, reminder.id)}
        customTypes={customTypes}
        submitLabel="Save changes"
        initial={{
          category,
          task,
          intervalMiles: reminder.intervalMiles?.toString() ?? "",
          intervalMonths: reminder.intervalMonths?.toString() ?? "",
        }}
      />
    </>
  );
}
