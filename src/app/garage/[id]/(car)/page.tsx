import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { MileageChart } from "@/components/mileage-chart";
import { StatusBadge } from "@/components/status-badge";
import { carTimeline } from "@/lib/car-timeline";
import { getEmailSettings } from "@/lib/email-settings";
import { isEmailVerified } from "@/lib/email-verification";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { signedPhotoUrls, signedThumbUrls } from "@/lib/photos";
import { listReminders } from "@/lib/reminder-store";
import { describeDue, rankReminders } from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { listMileageReadings, vehicleName } from "@/lib/vehicles";
import { PhotoControls } from "../photo-controls";
import { ProfilePhoto } from "../profile-photo";
import { RemoveCar } from "../remove-car";
import { formatDate, formatMonth, headingClass, loadCar, money, panelClass, sumCost } from "./shared";

// A glance at the car: its photo and key numbers, the odometer graph, what's
// due, and what happened last. Everything links out to its own tab.
export default function OverviewPage({ params }: PageProps<"/garage/[id]">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: Pick<PageProps<"/garage/[id]">, "params">) {
  const { user, car } = await loadCar(params);
  const [records, carMods, reminderRows, customTypes, settings, readings, canUpload, photos, thumbs] =
    await Promise.all([
      listServiceRecords(user.id, car.id),
      listMods(user.id, car.id),
      listReminders(user.id, car.id),
      listServiceTypes(user.id),
      getEmailSettings(user.id),
      listMileageReadings(user.id, car.id),
      isEmailVerified(user.id),
      signedPhotoUrls([car.photoPath]),
      signedThumbUrls([car.photoPath]),
    ]);

  const reminders = rankReminders(reminderRows, car, records, {
    dueSoonPercent: settings.reminderPercent,
  });
  const attention = reminders.filter(({ result }) => result.status !== "ok");
  const installed = carMods.filter((m) => m.status === "installed");
  const photoUrl = car.photoPath ? photos.get(car.photoPath) : null;
  const base = `/garage/${car.id}`;
  const timeline = carTimeline({
    currentMileage: car.currentMileage,
    readings,
    records,
    mods: carMods,
    reminders: reminders.map(({ reminder }) => reminder),
    href: (kind, itemId) =>
      `${base}/${{ service: "service", mod: "mods", reminder: "reminders" }[kind]}/${itemId}/edit`,
  });

  // Services and mods together, newest first.
  const activity = [
    ...records.map((r) => ({
      key: `s-${r.id}`,
      date: r.servicedOn,
      title: r.title,
      detail: categoryLabel(r.category, customTypes),
      href: `${base}/service`,
    })),
    ...carMods
      .filter((m) => m.installedOn)
      .map((m) => ({
        key: `m-${m.id}`,
        date: m.installedOn!,
        title: m.brand ? `${m.brand} ${m.part}` : m.part,
        detail: `Mod, ${modCategoryLabel(m.category)}`,
        href: `${base}/build`,
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const lastService = records[0];
  const stats = [
    {
      label: "Needs attention",
      value: attention.length === 0 ? "None" : String(attention.length),
      note: attention.length === 0 ? "All caught up" : attention[0].reminder.task,
      href: `${base}/reminders`,
    },
    {
      label: "Last service",
      value: lastService ? formatDate(lastService.servicedOn) : "None yet",
      note: lastService?.title ?? "Log one to start the history",
      href: `${base}/service`,
    },
    {
      label: "Spent on service",
      value: money.format(sumCost(records)),
      note: `${records.length} ${records.length === 1 ? "record" : "records"}`,
      href: `${base}/service`,
    },
    {
      label: "Invested in the build",
      value: money.format(sumCost(installed)),
      note: `${installed.length} ${installed.length === 1 ? "mod" : "mods"} installed`,
      href: `${base}/build`,
    },
  ];

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
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
          {(car.vin || car.builtOn) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
              {car.vin && (
                <span>
                  VIN <span className="font-mono text-chalk/80">{car.vin}</span>
                </span>
              )}
              {car.builtOn && <span>Built {formatMonth(car.builtOn)}</span>}
            </p>
          )}
        </div>

        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {stats.map((s) => (
            <li key={s.label} className="flex">
              <Link
                href={s.href}
                className="lift group flex min-w-0 flex-1 flex-col rounded-2xl border border-graphite bg-panel p-4 hover:border-steel sm:p-5"
              >
                <span className="flex items-center justify-between gap-2 text-sm text-steel">
                  {s.label}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-steel group-hover:text-chalk"
                    aria-hidden
                  />
                </span>
                <span className="readout mt-2 truncate text-2xl text-chalk sm:text-3xl">
                  {s.value}
                </span>
                <span className="mt-1 truncate text-sm text-steel">{s.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section className={`${panelClass} mt-6`}>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={panelClass}>
          <SectionHead title="Up next" href={`${base}/reminders`} link="All reminders" />
          {reminders.length === 0 ? (
            <p className="mt-4 text-sm text-steel">
              No reminders yet.{" "}
              <Link href={`${base}/reminders/new`} className="text-chalk underline underline-offset-2">
                Add one
              </Link>{" "}
              for oil changes, rotations, or anything on a schedule.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-rule">
              {reminders.slice(0, 4).map(({ reminder: r, result }) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.task}</p>
                    <p className="mt-0.5 text-sm text-steel">{describeDue(result)}</p>
                  </div>
                  <StatusBadge status={result.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={panelClass}>
          <SectionHead title="Recent activity" href={`${base}/service`} link="Service history" />
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-steel">
              Nothing logged yet.{" "}
              <Link href={`${base}/service/new`} className="text-chalk underline underline-offset-2">
                Log a service
              </Link>{" "}
              or{" "}
              <Link href={`${base}/mods/new`} className="text-chalk underline underline-offset-2">
                add a mod
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-rule">
              {activity.map((a) => (
                <li key={a.key}>
                  <Link href={a.href} className="flex items-baseline gap-4 py-3 hover:text-chalk">
                    <span className="w-24 shrink-0 text-sm text-steel tabular-nums">
                      {formatDate(a.date)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{a.title}</span>
                      <span className="block truncate text-sm text-steel">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <RemoveCar vehicleId={car.id} name={car.nickname ?? vehicleName(car)} />
    </>
  );
}

function SectionHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={headingClass}>{title}</h2>
      <Link href={href} className="flex min-h-11 items-center gap-0.5 text-sm text-steel hover:text-chalk">
        {link}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading car">
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="skeleton aspect-[4/3] w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
      <div className="skeleton mt-6 h-80" />
    </div>
  );
}
