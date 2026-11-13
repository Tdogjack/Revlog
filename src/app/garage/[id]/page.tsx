import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, ChevronDown, Copy, Download, FileUp, Pencil, Plus, Share2 } from "lucide-react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { PhotoStrip, type StripPhoto } from "@/components/photo-strip";
import { DeletePostButton } from "@/app/community/delete-post-button";
import { requireUser } from "@/lib/auth";
import { carTimeline } from "@/lib/car-timeline";
import { getBuildPostId } from "@/lib/community";
import { getEmailSettings } from "@/lib/email-settings";
import { isEmailVerified } from "@/lib/email-verification";
import { listPhotosForVehicle, PHOTO_LIMITS } from "@/lib/gallery";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { listPartsForVehicle } from "@/lib/parts";
import { signedPhotoUrls, signedThumbUrls } from "@/lib/photos";
import { listReminders } from "@/lib/reminder-store";
import {
  describeDue,
  rankReminders,
} from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, listMileageReadings, vehicleName } from "@/lib/vehicles";
import { DeleteRecordButton } from "./delete-record-button";
import { ModControls } from "./mod-controls";
import { PartsList } from "./parts-list";
import { PhotoControls } from "./photo-controls";
import { ProfilePhoto } from "./profile-photo";
import { RemoveCar } from "./remove-car";
import { MileageEditor, ReminderControls } from "./reminder-controls";
import { markNeverDone } from "./reminders/actions";
import { MileageChart } from "@/components/mileage-chart";
import { cardClass, RecordStats } from "@/components/record-stats";
import { StatusBadge } from "@/components/status-badge";

export default function VehiclePage({ params }: PageProps<"/garage/[id]">) {
  return (
    <>
      <BackLink href="/garage">Garage</BackLink>
      <Suspense fallback={<CarSkeleton />}>
        <VehicleDetails params={params} />
      </Suspense>
    </>
  );
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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

// Sections are quiet L1 panels; rows inside are split by hairlines.
const panelClass = "rounded-2xl border border-graphite bg-panel p-4 sm:p-6";
const sectionHeadClass = "flex flex-wrap items-start justify-between gap-3";
const headingClass = "font-display text-2xl font-semibold";
const dateClass = "shrink-0 pt-0.5 text-sm text-steel tabular-nums sm:w-24";

// Records always open, since their edit and copy buttons live inside; without
// notes, parts, or photos the hint just says so.
function DetailsHint({ notes, parts, photos }: { notes: boolean; parts: number; photos: number }) {
  const bits = [
    notes && "notes",
    parts > 0 && `${parts} ${parts === 1 ? "part" : "parts"}`,
    photos > 0 && `${photos} ${photos === 1 ? "photo" : "photos"}`,
  ].filter(Boolean);
  return (
    <p className="mt-1.5 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      {bits.length > 0 ? bits.join(" · ") : "Options"}
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

  const [
    records,
    carMods,
    reminderRows,
    customTypes,
    carParts,
    gallery,
    settings,
    buildPostId,
    readings,
    canUpload,
  ] = await Promise.all([
      listServiceRecords(user.id, car.id),
      listMods(user.id, car.id),
      listReminders(user.id, car.id),
      listServiceTypes(user.id),
      listPartsForVehicle(user.id, car.id),
      listPhotosForVehicle(user.id, car.id),
      getEmailSettings(user.id),
      getBuildPostId(user.id, car.id),
      listMileageReadings(user.id, car.id),
      isEmailVerified(user.id),
    ]);
  const [photos, thumbs] = await Promise.all([
    signedPhotoUrls([car.photoPath, ...gallery.map((p) => p.storagePath)]),
    signedThumbUrls([car.photoPath, ...gallery.map((p) => p.storagePath)]),
  ]);
  // Grids load the small copy; the full photo only opens in the viewer.
  const stripPhotos = (match: (p: (typeof gallery)[number]) => boolean): StripPhoto[] =>
    gallery.filter(match).flatMap((p) => {
      const url = photos.get(p.storagePath);
      return url ? [{ id: p.id, url, thumb: thumbs.get(p.storagePath) ?? url }] : [];
    });
  const buildPhotos = stripPhotos((p) => !p.modId && !p.serviceRecordId);
  const partsFor = (key: "modId" | "serviceRecordId", id: string) =>
    carParts.filter((p) => p[key] === id);
  // Each reminder counts from its latest matching service record, or the
  // car's age if it's never been done; most urgent first.
  const carReminders = rankReminders(reminderRows, car, records, {
    dueSoonPercent: settings.reminderPercent,
  });
  const photoUrl = car.photoPath ? photos.get(car.photoPath) : null;
  const sumCost = (items: { cost: string | null }[]) =>
    items.reduce((sum, i) => sum + (i.cost ? Number(i.cost) : 0), 0);
  const totalSpent = sumCost(records);
  const installed = carMods.filter((m) => m.status === "installed");
  const installedSpent = sumCost(installed);
  const plannedCost = sumCost(carMods.filter((m) => m.status === "planned"));
  const timeline = carTimeline({
    currentMileage: car.currentMileage,
    readings,
    records,
    mods: carMods,
    reminders: carReminders.map(({ reminder }) => reminder),
    href: (kind, itemId) =>
      `/garage/${car.id}/${{ service: "service", mod: "mods", reminder: "reminders" }[kind]}/${itemId}/edit`,
  });

  const renderRecord = (r: (typeof records)[number]) => {
    const recordPhotos = stripPhotos((p) => p.serviceRecordId === r.id);
    return (
      <li
        key={r.id}
        className={`${cardClass} flex flex-col gap-1 sm:flex-row sm:gap-4`}
      >
        <div className={dateClass}>{formatDate(r.servicedOn)}</div>
        <details className="group min-w-0 flex-1">
          <summary className={summaryClass}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-steel">{categoryLabel(r.category, customTypes)}</p>
            </div>
            <RecordStats miles={r.mileage} cost={r.cost} extra={[r.shop]} />
            <DetailsHint
              notes={!!r.notes}
              parts={partsFor("serviceRecordId", r.id).length}
              photos={recordPhotos.length}
            />
          </summary>
          {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
          <PartsList
            vehicleId={car.id}
            parts={partsFor("serviceRecordId", r.id)}
            label="Parts used"
          />
          {recordPhotos.length > 0 && (
            <PhotoStrip
              vehicleId={car.id}
              kind="record"
              targetId={r.id}
              photos={recordPhotos}
              max={PHOTO_LIMITS.record}
              addLabel="Add receipt photos"
              canAdd={false}
            />
          )}
          <div className="mt-2 -ml-2 flex items-center">
            <Link
              href={`/garage/${car.id}/service/new?copy=${r.id}`}
              aria-label="Copy record"
              title="Log again (copies parts too)"
              className="icon-btn"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`/garage/${car.id}/service/${r.id}/edit`}
              aria-label="Edit record"
              title="Edit record"
              className="icon-btn"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
            <DeleteRecordButton vehicleId={car.id} recordId={r.id} />
          </div>
        </details>
      </li>
    );
  };

  return (
    <>
      <title>{`${car.nickname ?? vehicleName(car)} · Revlog`}</title>
      <header className="mt-6 flex flex-col gap-6 border-b border-graphite pb-8 sm:flex-row sm:items-end">
        <div className="flex flex-col items-start gap-2">
          <ProfilePhoto
            src={photoUrl ?? null}
            thumb={car.photoPath ? thumbs.get(car.photoPath) : undefined}
            alt={vehicleName(car)}
          />
          <PhotoControls
            vehicleId={car.id}
            hasPhoto={!!car.photoPath}
            photoUrl={photoUrl}
            canUpload={canUpload}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:pb-8">
          <div>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">
              {car.nickname ?? vehicleName(car)}
            </h1>
            {car.nickname && <p className="mt-2 text-steel">{vehicleName(car)}</p>}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <MileageEditor vehicleId={car.id} currentMileage={car.currentMileage} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {car.vin && (
                <p className="text-xs text-steel">
                  VIN <span className="font-mono text-chalk/80">{car.vin}</span>
                </p>
              )}
              {car.builtOn && (
                <p className="text-xs text-steel">Built {formatMonth(car.builtOn)}</p>
              )}
              <Link href={`/garage/${car.id}/edit`} className="btn">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit car
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className={`${panelClass} mt-8`}>
        <h2 className={headingClass}>Mileage</h2>
        {timeline ? (
          <div className="mt-4">
            <MileageChart timeline={timeline} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-steel">
            Update the odometer or log a service with its mileage to start the graph.
          </p>
        )}
      </section>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <div>
                <h2 className={headingClass}>Service history</h2>
                {records.length > 0 && (
                  <p className="mt-1 text-sm text-steel">
                    {records.length} {records.length === 1 ? "record" : "records"}
                    {totalSpent > 0 && `, ${money.format(totalSpent)} spent`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {records.length > 0 && (
                  <a
                    href={`/garage/${car.id}/history`}
                    className="btn"
                    title="Download service history as a PDF"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF
                  </a>
                )}
                <Link
                  href={`/garage/${car.id}/service/import`}
                  className="btn"
                  title="Add past services from photos, PDFs, or a spreadsheet"
                >
                  <FileUp className="h-4 w-4" aria-hidden />
                  Import
                </Link>
                <Link href={`/garage/${car.id}/service/new`} className="btn btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  Log service
                </Link>
              </div>
            </div>

            {records.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No service records yet. Log your last oil change to start the timeline, or{" "}
                <Link
                  href={`/garage/${car.id}/service/import`}
                  className="text-chalk underline underline-offset-2 hover:text-redline"
                >
                  import its past services
                </Link>{" "}
                all at once.
              </p>
            ) : (
              <>
                <ol className="mt-4 space-y-2">
                  {groupByType(records).map((group) =>
                    group.length === 1 ? (
                      renderRecord(group[0])
                    ) : (
                      <li key={group[0].category} className={`${cardClass}`}>
                        <details className="group/type">
                          <summary
                            className={`${summaryClass} flex flex-col gap-1 sm:flex-row sm:gap-4`}
                          >
                            <div className={dateClass}>{formatDate(group[0].servicedOn)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">
                                {categoryLabel(group[0].category, customTypes)}
                              </p>
                              <RecordStats
                                miles={group[0].mileage}
                                extra={[
                                  `Last of ${group.length}`,
                                  sumCost(group) > 0 && `${money.format(sumCost(group))} total`,
                                ]}
                              />
                              <p className="mt-1.5 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
                                <ChevronDown
                                  className="h-3.5 w-3.5 transition-transform group-open/type:rotate-180"
                                  aria-hidden
                                />
                                Show all {group.length}
                              </p>
                            </div>
                          </summary>
                          <ol className="mt-3 space-y-2">
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

          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <div>
                <h2 className={headingClass}>Build</h2>
                {carMods.length > 0 && (
                  <p className="mt-1 text-sm text-steel">
                    {[
                      `${installed.length} installed`,
                      installedSpent > 0 && `${money.format(installedSpent)} invested`,
                      plannedCost > 0 && `${money.format(plannedCost)} planned`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/community/new?vehicle=${car.id}&build=1`} className="btn">
                  <Share2 className="h-4 w-4" aria-hidden />
                  {buildPostId ? "Update public build" : "Post public build"}
                </Link>
                <Link href={`/garage/${car.id}/mods/new`} className="btn">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add mod
                </Link>
              </div>
            </div>

            {buildPostId && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-carbon/60 px-3 py-2 text-sm text-steel">
                <span className="flex items-center gap-2 text-chalk">
                  <span className="h-1.5 w-1.5 rounded-full bg-done" aria-hidden />
                  Your public build is live.
                </span>
                <Link
                  href={`/community/${buildPostId}`}
                  className="underline-offset-4 hover:text-chalk hover:underline"
                >
                  View post
                </Link>
                <DeletePostButton
                  postId={buildPostId}
                  next={`/garage/${car.id}`}
                  label="Take down"
                  confirmText="Take down your public build? The post and its shared photos are removed. You can post it again any time."
                />
              </div>
            )}

            <div className="mt-4">
              <PhotoStrip
                vehicleId={car.id}
                kind="build"
                photos={buildPhotos}
                max={PHOTO_LIMITS.build}
                addLabel="Add build photos"
                size="large"
                canAdd={canUpload}
              />
              {!canUpload && (
                <div className="mt-2">
                  <ConfirmEmailNote />
                </div>
              )}
            </div>

            {carMods.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No mods logged yet. Add parts you&apos;ve installed, or plan your next build.
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {carMods.map((m) => {
                    const modParts = partsFor("modId", m.id);
                    const modPhotos = stripPhotos((p) => p.modId === m.id);
                    const summary = (
                      <>
                        <p
                          className={`font-semibold ${m.status === "removed" ? "text-steel line-through" : ""}`}
                        >
                          {m.brand ? `${m.brand} ${m.part}` : m.part}
                        </p>
                        <RecordStats
                          miles={m.installedMileage}
                          cost={m.cost}
                          extra={[modCategoryLabel(m.category), m.installedOn && formatDate(m.installedOn)]}
                        />
                      </>
                    );
                    return (
                      <li key={m.id} className={`${cardClass} flex flex-col gap-2 sm:flex-row sm:gap-4`}>
                        {m.notes || modParts.length > 0 || modPhotos.length > 0 ? (
                          <details className="group min-w-0 flex-1">
                            <summary className={summaryClass}>
                              {summary}
                              <DetailsHint
                                notes={!!m.notes}
                                parts={modParts.length}
                                photos={modPhotos.length}
                              />
                            </summary>
                            {m.notes && <p className="mt-2 whitespace-pre-line text-sm">{m.notes}</p>}
                            <PartsList
                              vehicleId={car.id}
                              parts={modParts}
                              label={m.status === "planned" ? "Parts wanted" : "Parts used"}
                            />
                            {modPhotos.length > 0 && (
                              <PhotoStrip
                                vehicleId={car.id}
                                kind="mod"
                                targetId={m.id}
                                photos={modPhotos}
                                max={PHOTO_LIMITS.mod}
                                addLabel="Add mod photos"
                                canAdd={false}
                              />
                            )}
                          </details>
                        ) : (
                          <div className="min-w-0 flex-1">{summary}</div>
                        )}
                        <div className="-ml-1 flex items-center gap-1 sm:ml-0 sm:flex-col sm:items-end">
                          <ModControls vehicleId={car.id} modId={m.id} status={m.status} />
                          {m.status === "installed" && (
                            <Link
                              href={`/community/new?vehicle=${car.id}&mod=${m.id}`}
                              className="flex min-h-9 items-center gap-1 px-1 text-xs text-steel hover:text-chalk"
                            >
                              <Share2 className="h-3.5 w-3.5" aria-hidden />
                              Share
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <h2 className={headingClass}>Reminders</h2>
              <Link href={`/garage/${car.id}/reminders/new`} className="btn">
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Link>
            </div>

            {carReminders.length === 0 ? (
              <p className="mt-4 text-sm text-steel">
                No reminders set. Add one for oil changes, rotations, or anything on a schedule.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {carReminders.map(({ reminder: r, result }) => (
                  <li
                    key={r.id}
                    className={`${cardClass} flex flex-wrap gap-3`}
                  >
                    <details className="group min-w-0 flex-1">
                      <summary className={summaryClass}>
                        <p className="font-semibold">{r.task}</p>
                        <p
                          className={`mt-1 text-base font-semibold ${
                            result.status === "overdue"
                              ? "text-overdue"
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
                        ) : result.status === "unknown" ? (
                          "Last done: not logged"
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
                      {result.status !== "unknown" && (
                        <Link
                          href={`/garage/${car.id}/service/new?reminder=${r.id}`}
                          className="btn min-h-8 px-2.5 text-xs"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Done
                        </Link>
                      )}
                    </div>
                    {result.status === "unknown" && (
                      <div className="grid basis-full grid-cols-2 gap-2">
                        <Link
                          href={`/garage/${car.id}/service/new?reminder=${r.id}`}
                          className="btn"
                        >
                          Log service
                        </Link>
                        <form action={markNeverDone.bind(null, car.id, r.id)}>
                          <button type="submit" className="btn w-full">
                            Never done
                          </button>
                        </form>
                      </div>
                    )}
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

// Placeholder shaped like the car header and its two columns.
function CarSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-label="Loading car">
      <div className="flex flex-col gap-6 border-b border-graphite pb-8 sm:flex-row sm:items-end">
        <div className="skeleton aspect-[4/3] w-full sm:w-80" />
        <div className="flex-1 space-y-4 sm:pb-8">
          <div className="skeleton h-12 w-2/3" />
          <div className="skeleton h-10 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="skeleton h-80 md:col-span-2" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
