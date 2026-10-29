import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bell, Copy, Pencil, Plus, Wrench, Zap } from "lucide-react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { requireUser } from "@/lib/auth";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { listPartsForVehicle } from "@/lib/parts";
import { signedPhotoUrls } from "@/lib/photos";
import { listReminders } from "@/lib/reminder-store";
import { describeDue, evaluateReminder, STATUS_RANK, withLastService } from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { DeleteRecordButton } from "./delete-record-button";
import { ModControls } from "./mod-controls";
import { PartsList } from "./parts-list";
import { PhotoControls } from "./photo-controls";
import { MileageEditor, ReminderControls } from "./reminder-controls";
import { StatusBadge } from "@/components/status-badge";

export default function VehiclePage({ params }: PageProps<"/garage/[id]">) {
  return (
    <>
      <Link href="/garage" className="text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading car…</p>}>
        <VehicleDetails params={params} />
      </Suspense>
    </>
  );
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Stored as YYYY-MM-DD; format in UTC so the day never shifts.
function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function VehicleDetails({ params }: Pick<PageProps<"/garage/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();

  const [records, carMods, reminderRows, customTypes, carParts, photos] = await Promise.all([
    listServiceRecords(user.id, car.id),
    listMods(user.id, car.id),
    listReminders(user.id, car.id),
    listServiceTypes(user.id),
    listPartsForVehicle(user.id, car.id),
    signedPhotoUrls([car.photoPath]),
  ]);
  const partsFor = (key: "modId" | "serviceRecordId", id: string) =>
    carParts.filter((p) => p[key] === id);
  // Each reminder counts from its latest matching service record; most urgent first.
  const carReminders = reminderRows
    .map((row) => withLastService(row, records))
    .map((reminder) => ({ reminder, result: evaluateReminder(reminder, car.currentMileage) }))
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status]);
  const photoUrl = car.photoPath ? photos.get(car.photoPath) : null;
  const sumCost = (items: { cost: string | null }[]) =>
    items.reduce((sum, i) => sum + (i.cost ? Number(i.cost) : 0), 0);
  const totalSpent = sumCost(records);
  const installed = carMods.filter((m) => m.status === "installed");
  const installedSpent = sumCost(installed);
  const plannedCost = sumCost(carMods.filter((m) => m.status === "planned"));

  return (
    <>
      <title>{`${car.nickname ?? vehicleName(car)} · Revlog`}</title>
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-graphite bg-panel p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-2">
          <VehiclePhoto src={photoUrl} alt={vehicleName(car)} className="h-28 w-28" />
          <PhotoControls vehicleId={car.id} hasPhoto={!!car.photoPath} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">{car.nickname ?? vehicleName(car)}</h1>
              {car.nickname && <p className="mt-1 text-steel">{vehicleName(car)}</p>}
            </div>
            <MileageEditor vehicleId={car.id} currentMileage={car.currentMileage} />
          </div>
          {car.vin && <p className="mt-3 font-mono text-xs text-steel">VIN {car.vin}</p>}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <section className="rounded-xl border border-graphite bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <Wrench className="h-4 w-4 text-redline" aria-hidden />
                Service history
              </h2>
              <Link
                href={`/garage/${car.id}/service/new`}
                className="flex items-center gap-1 rounded-md bg-redline px-3 py-1.5 text-sm font-medium text-white hover:bg-redline-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Log service
              </Link>
            </div>

            {records.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No service records yet. Log your last oil change to start the timeline.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-steel">
                  {records.length} {records.length === 1 ? "record" : "records"}
                  {totalSpent > 0 && ` · ${money.format(totalSpent)} spent`}
                </p>
                <ol className="mt-4">
                  {records.map((r) => (
                    <li key={r.id} className="flex gap-4 border-t border-graphite py-4">
                      <div className="w-24 shrink-0 font-mono text-xs text-steel">
                        {formatDate(r.servicedOn)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{r.title}</p>
                          <span className="rounded bg-graphite px-2 py-0.5 text-xs">
                            {categoryLabel(r.category, customTypes)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-steel">
                          {[
                            r.mileage != null && `${r.mileage.toLocaleString("en-US")} mi`,
                            r.cost != null && money.format(Number(r.cost)),
                            r.shop,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
                        <PartsList
                          vehicleId={car.id}
                          parent={{ serviceRecordId: r.id }}
                          parts={partsFor("serviceRecordId", r.id)}
                          label="Parts used"
                        />
                      </div>
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/garage/${car.id}/service/new?copy=${r.id}`}
                          aria-label="Copy record"
                          title="Log again (copies parts too)"
                          className="text-steel hover:text-chalk"
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                        </Link>
                        <Link
                          href={`/garage/${car.id}/service/${r.id}/edit`}
                          aria-label="Edit record"
                          className="text-steel hover:text-chalk"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Link>
                        <DeleteRecordButton vehicleId={car.id} recordId={r.id} />
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <section className="rounded-xl border border-graphite bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-redline" aria-hidden />
                Mods
              </h2>
              <Link
                href={`/garage/${car.id}/mods/new`}
                className="flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm font-medium hover:border-steel"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add mod
              </Link>
            </div>

            {carMods.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No mods logged yet. Add parts you&apos;ve installed, or plan your next build.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-steel">
                  {[
                    `${installed.length} installed`,
                    installedSpent > 0 && `${money.format(installedSpent)} invested`,
                    plannedCost > 0 && `${money.format(plannedCost)} planned`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <ul className="mt-4">
                  {carMods.map((m) => (
                    <li key={m.id} className="flex gap-4 border-t border-graphite py-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-medium ${m.status === "removed" ? "text-steel line-through" : ""}`}
                        >
                          {m.brand ? `${m.brand} ${m.part}` : m.part}
                        </p>
                        <p className="mt-1 text-sm text-steel">
                          {[
                            modCategoryLabel(m.category),
                            m.installedOn && formatDate(m.installedOn),
                            m.installedMileage != null &&
                              `${m.installedMileage.toLocaleString("en-US")} mi`,
                            m.cost != null && money.format(Number(m.cost)),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {m.notes && <p className="mt-2 whitespace-pre-line text-sm">{m.notes}</p>}
                        <PartsList
                          vehicleId={car.id}
                          parent={{ modId: m.id }}
                          parts={partsFor("modId", m.id)}
                          label={m.status === "planned" ? "Parts wanted" : "Parts used"}
                        />
                      </div>
                      <ModControls vehicleId={car.id} modId={m.id} status={m.status} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-graphite bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <Bell className="h-4 w-4 text-redline" aria-hidden />
                Reminders
              </h2>
              <Link
                href={`/garage/${car.id}/reminders/new`}
                className="flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm font-medium hover:border-steel"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Link>
            </div>

            {carReminders.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No reminders set. Add one for oil changes, rotations, or anything on a schedule.
              </p>
            ) : (
              <ul className="mt-4">
                {carReminders.map(({ reminder: r, result }) => (
                  <li key={r.id} className="border-t border-graphite py-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{r.task}</p>
                      <StatusBadge status={result.status} />
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        result.status === "overdue"
                          ? "font-medium text-overdue"
                          : result.status === "due_soon"
                            ? "text-due"
                            : "text-steel"
                      }`}
                    >
                      {describeDue(result)}
                    </p>
                    <p className="mt-0.5 text-xs text-steel">
                      {r.lastDoneOn ? (
                        <>
                          Last done {formatDate(r.lastDoneOn)}
                          {r.lastDoneMileage != null &&
                            ` at ${r.lastDoneMileage.toLocaleString("en-US")} mi`}
                        </>
                      ) : (
                        "Last done: never"
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-steel">
                      Every{" "}
                      {[
                        r.intervalMiles && `${r.intervalMiles.toLocaleString("en-US")} mi`,
                        r.intervalMonths &&
                          `${r.intervalMonths} ${r.intervalMonths === 1 ? "month" : "months"}`,
                      ]
                        .filter(Boolean)
                        .join(" or ")}
                    </p>
                    <div className="mt-3">
                      <ReminderControls
                        vehicleId={car.id}
                        reminderId={r.id}
                        currentMileage={car.currentMileage}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
