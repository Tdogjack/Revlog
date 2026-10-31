import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Copy,
  Download,
  Pencil,
  Plus,
  Share2,
  Wrench,
  Zap,
} from "lucide-react";
import { PhotoStrip, type StripPhoto } from "@/components/photo-strip";
import { requireUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/email-settings";
import { listPhotosForVehicle, PHOTO_LIMITS } from "@/lib/gallery";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { listPartsForVehicle } from "@/lib/parts";
import { signedPhotoUrls } from "@/lib/photos";
import { listReminders } from "@/lib/reminder-store";
import {
  describeDue,
  evaluateReminder,
  STATUS_RANK,
  withCarAgeStart,
  withLastService,
} from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { DeleteRecordButton } from "./delete-record-button";
import { ModControls } from "./mod-controls";
import { PartsList } from "./parts-list";
import { PhotoControls } from "./photo-controls";
import { ProfilePhoto } from "./profile-photo";
import { RemoveCar } from "./remove-car";
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

function formatMonth(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
}

// Records and mods show one summary line; notes, parts, and photos open on click.
const summaryClass = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";

function DetailsHint({ notes, parts, photos }: { notes: boolean; parts: number; photos: number }) {
  const bits = [
    notes && "notes",
    parts > 0 && `${parts} ${parts === 1 ? "part" : "parts"}`,
    photos > 0 && `${photos} ${photos === 1 ? "photo" : "photos"}`,
  ].filter(Boolean);
  return (
    <p className="mt-1 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      {bits.length > 0 ? bits.join(" · ") : "Add parts or photos"}
    </p>
  );
}

// Records of the same service type, newest group first. Records arrive newest
// first, so each group's first record is the last time it was done.
function groupByType<R extends { category: string }>(records: R[]) {
  const groups = new Map<string, R[]>();
  for (const r of records) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return [...groups.values()];
}

async function VehicleDetails({ params }: Pick<PageProps<"/garage/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();

  const [records, carMods, reminderRows, customTypes, carParts, gallery, settings] =
    await Promise.all([
      listServiceRecords(user.id, car.id),
      listMods(user.id, car.id),
      listReminders(user.id, car.id),
      listServiceTypes(user.id),
      listPartsForVehicle(user.id, car.id),
      listPhotosForVehicle(user.id, car.id),
      getEmailSettings(user.id),
    ]);
  const photos = await signedPhotoUrls([car.photoPath, ...gallery.map((p) => p.storagePath)]);
  const stripPhotos = (match: (p: (typeof gallery)[number]) => boolean): StripPhoto[] =>
    gallery.filter(match).flatMap((p) => {
      const url = photos.get(p.storagePath);
      return url ? [{ id: p.id, url }] : [];
    });
  const buildPhotos = stripPhotos((p) => !p.modId && !p.serviceRecordId);
  const partsFor = (key: "modId" | "serviceRecordId", id: string) =>
    carParts.filter((p) => p[key] === id);
  // Each reminder counts from its latest matching service record, or the
  // car's age if it's never been done; most urgent first.
  const carReminders = reminderRows
    .map((row) => withCarAgeStart(withLastService(row, records), car))
    .map((reminder) => ({
      reminder,
      result: evaluateReminder(reminder, car.currentMileage, undefined, {
        dueSoonPercent: settings.reminderPercent,
      }),
    }))
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status]);
  const photoUrl = car.photoPath ? photos.get(car.photoPath) : null;
  const sumCost = (items: { cost: string | null }[]) =>
    items.reduce((sum, i) => sum + (i.cost ? Number(i.cost) : 0), 0);
  const totalSpent = sumCost(records);
  const installed = carMods.filter((m) => m.status === "installed");
  const installedSpent = sumCost(installed);
  const plannedCost = sumCost(carMods.filter((m) => m.status === "planned"));

  const renderRecord = (r: (typeof records)[number]) => (
    <li
      key={r.id}
      className="flex gap-4 border-t border-graphite py-3 -mx-2 rounded-md px-2 transition-colors hover:bg-graphite/40"
    >
      <div className="w-24 shrink-0 pt-0.5 font-mono text-xs text-steel">
        {formatDate(r.servicedOn)}
      </div>
      <details className="group min-w-0 flex-1">
        <summary className={summaryClass}>
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
          <DetailsHint
            notes={!!r.notes}
            parts={partsFor("serviceRecordId", r.id).length}
            photos={stripPhotos((p) => p.serviceRecordId === r.id).length}
          />
        </summary>
        {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
        <PartsList
          vehicleId={car.id}
          parent={{ serviceRecordId: r.id }}
          parts={partsFor("serviceRecordId", r.id)}
          label="Parts used"
        />
        <PhotoStrip
          vehicleId={car.id}
          kind="record"
          targetId={r.id}
          photos={stripPhotos((p) => p.serviceRecordId === r.id)}
          max={PHOTO_LIMITS.record}
          addLabel="Add receipt photos"
        />
        <div className="mt-3 flex items-center gap-3">
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
      </details>
    </li>
  );

  return (
    <>
      <title>{`${car.nickname ?? vehicleName(car)} · Revlog`}</title>
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-graphite bg-panel p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-2">
          <ProfilePhoto src={photoUrl ?? null} alt={vehicleName(car)} />
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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {car.vin && <p className="font-mono text-xs text-steel">VIN {car.vin}</p>}
            {car.builtOn && (
              <p className="font-mono text-xs text-steel">Built {formatMonth(car.builtOn)}</p>
            )}
            <Link
              href={`/garage/${car.id}/edit`}
              className="flex items-center gap-1 rounded-md border border-graphite px-2.5 py-1 text-xs font-medium hover:border-steel"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit car
            </Link>
          </div>
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
              <div className="flex items-center gap-2">
                {records.length > 0 && (
                  <a
                    href={`/garage/${car.id}/history`}
                    className="flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm font-medium hover:border-steel"
                    title="Download service history as a PDF"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF
                  </a>
                )}
                <Link
                  href={`/garage/${car.id}/service/new`}
                  className="flex items-center gap-1 rounded-md bg-redline px-3 py-1.5 text-sm font-medium text-white hover:bg-redline-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Log service
                </Link>
              </div>
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
                  {groupByType(records).map((group) =>
                    group.length === 1 ? (
                      renderRecord(group[0])
                    ) : (
                      <li key={group[0].category} className="border-t border-graphite">
                        <details className="group/type">
                          <summary
                            className={`${summaryClass} flex gap-4 py-3 -mx-2 rounded-md px-2 transition-colors hover:bg-graphite/40`}
                          >
                            <div className="w-24 shrink-0 pt-0.5 font-mono text-xs text-steel">
                              {formatDate(group[0].servicedOn)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">
                                {categoryLabel(group[0].category, customTypes)}
                              </p>
                              <p className="mt-1 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
                                <ChevronDown
                                  className="h-3.5 w-3.5 transition-transform group-open/type:rotate-180"
                                  aria-hidden
                                />
                                {[
                                  `${group.length} times`,
                                  group[0].mileage != null &&
                                    `last at ${group[0].mileage.toLocaleString("en-US")} mi`,
                                  sumCost(group) > 0 && `${money.format(sumCost(group))} total`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                          </summary>
                          <ol className="mb-3 ml-2 border-l border-graphite pl-4">
                            {group.map(renderRecord)}
                          </ol>
                        </details>
                      </li>
                    ),
                  )}
                </ol>
              </>
            )}
          </section>

          <section className="rounded-xl border border-graphite bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-redline" aria-hidden />
                Build
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href={`/community/new?vehicle=${car.id}`}
                  className="flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm font-medium hover:border-steel"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share build
                </Link>
                <Link
                  href={`/garage/${car.id}/mods/new`}
                  className="flex items-center gap-1 rounded-md border border-graphite px-3 py-1.5 text-sm font-medium hover:border-steel"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add mod
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <PhotoStrip
                vehicleId={car.id}
                kind="build"
                photos={buildPhotos}
                max={PHOTO_LIMITS.build}
                addLabel="Add build photos"
                size="large"
              />
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
                    <li
                      key={m.id}
                      className="flex gap-4 border-t border-graphite py-3 -mx-2 rounded-md px-2 transition-colors hover:bg-graphite/40"
                    >
                      <details className="group min-w-0 flex-1">
                        <summary className={summaryClass}>
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
                          <DetailsHint
                            notes={!!m.notes}
                            parts={partsFor("modId", m.id).length}
                            photos={stripPhotos((p) => p.modId === m.id).length}
                          />
                        </summary>
                        {m.notes && <p className="mt-2 whitespace-pre-line text-sm">{m.notes}</p>}
                        <PartsList
                          vehicleId={car.id}
                          parent={{ modId: m.id }}
                          parts={partsFor("modId", m.id)}
                          label={m.status === "planned" ? "Parts wanted" : "Parts used"}
                        />
                        <PhotoStrip
                          vehicleId={car.id}
                          kind="mod"
                          targetId={m.id}
                          photos={stripPhotos((p) => p.modId === m.id)}
                          max={PHOTO_LIMITS.mod}
                          addLabel="Add mod photos"
                        />
                      </details>
                      <div className="flex flex-col items-end gap-3">
                        <ModControls vehicleId={car.id} modId={m.id} status={m.status} />
                        {m.status === "installed" && (
                          <Link
                            href={`/community/new?vehicle=${car.id}&mod=${m.id}`}
                            className="flex items-center gap-1 text-xs text-steel hover:text-chalk"
                          >
                            <Share2 className="h-3.5 w-3.5" aria-hidden />
                            Share
                          </Link>
                        )}
                      </div>
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
                  <li
                    key={r.id}
                    className="flex gap-3 border-t border-graphite py-3 -mx-2 rounded-md px-2 transition-colors hover:bg-graphite/40"
                  >
                    <details className="group min-w-0 flex-1">
                      <summary className={summaryClass}>
                        <p className="font-medium">{r.task}</p>
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
                        <ChevronDown
                          className="mt-1 h-3.5 w-3.5 text-steel transition-transform group-open:rotate-180 hover:text-chalk"
                          aria-label="Details"
                        />
                      </summary>
                      <p className="mt-1 text-xs text-steel">
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
                      <ReminderControls vehicleId={car.id} reminderId={r.id} />
                    </details>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge status={result.status} />
                      {/* Opens Log service with this reminder's type filled in. */}
                      <Link
                        href={`/garage/${car.id}/service/new?reminder=${r.id}`}
                        className="flex items-center gap-1 rounded-md border border-graphite px-2 py-1 text-xs hover:border-steel"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Done
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <RemoveCar vehicleId={car.id} name={car.nickname ?? vehicleName(car)} />
    </>
  );
}
