import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { PHOTO_LIMITS } from "@/lib/gallery";
import { toPartRows } from "@/lib/part-rows";
import { listPartsForParent } from "@/lib/parts";
import { listReminders } from "@/lib/reminder-store";
import { mileageTypes } from "@/lib/service-categories";
import { getServiceRecord } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { addReminderService, addServiceRecord } from "../actions";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Log service · Revlog" };

type Props = PageProps<"/garage/[id]/service/new">;

export default function NewServicePage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <NewService params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

async function NewService({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, { copy, reminder: reminderId }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const photosLocked = !(await isEmailVerified(user.id));
  const [car, customTypes] = await Promise.all([
    getVehicle(user.id, id),
    listServiceTypes(user.id),
  ]);
  if (!car) notFound();
  const reminders = await listReminders(user.id, car.id);
  // "Mark done" on a reminder starts from that reminder's type and name.
  const reminder =
    typeof reminderId === "string" ? (reminders.find((r) => r.id === reminderId) ?? null) : null;

  // "Copy" starts from an existing record: everything carries over except the
  // date (today) and mileage (blank), which are what usually change.
  const source = typeof copy === "string" ? await getServiceRecord(user.id, car.id, copy) : null;
  const sourceParts = source
    ? await listPartsForParent(user.id, { serviceRecordId: source.id })
    : [];

  return (
    <>
      <BackLink href={`/garage/${car.id}`}>{car.nickname ?? vehicleName(car)}</BackLink>
      <h1 className="mt-4 font-display text-4xl font-semibold">Log service</h1>
      {source && (
        <p className="mt-2 rounded-md bg-graphite px-3 py-2 text-sm">
          Copied from {source.title} on {formatDate(source.servicedOn)}. Update the date and
          mileage, then save.
        </p>
      )}
      {reminder && (
        <p className="mt-2 rounded-md bg-graphite px-3 py-2 text-sm">
          Marking {reminder.task} done. Check the date and mileage, then save.
        </p>
      )}
      <ServiceForm
        action={
          reminder
            ? addReminderService.bind(null, car.id, reminder.id)
            : addServiceRecord.bind(null, car.id)
        }
        currentMileage={car.currentMileage}
        customTypes={customTypes}
        mileageTypes={mileageTypes(reminders)}
        initial={
          source
            ? {
                category: source.category,
                title: source.title,
                // With parts, leave cost blank so it re-totals at today's prices.
                cost: sourceParts.length > 0 ? "" : (source.cost ?? ""),
                shop: source.shop ?? "",
                notes: source.notes ?? "",
              }
            : reminder
              ? { category: reminder.serviceCategory ?? "other", title: reminder.task }
              : undefined
        }
        initialParts={toPartRows(sourceParts, { keepIds: false })}
        photos={{ vehicleId: car.id, max: PHOTO_LIMITS.record, locked: photosLocked }}
      />
    </>
  );
}
