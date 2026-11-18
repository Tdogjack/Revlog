"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Download, Pencil, Plus, Share2 } from "lucide-react";
import { Gauge, MiniDial } from "@/components/gauges";
import { MileageChart } from "@/components/mileage-chart";
import { StatusBadge } from "@/components/status-badge";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { ProfilePhoto } from "@/app/garage/[id]/profile-photo";
import { DraggableMod, ModDropZone } from "@/app/garage/[id]/mod-drag";
import {
  demoCarName,
  demoTimeline,
  evaluateDemoReminders,
  modName,
  type DemoCar,
  type DemoMod,
  type DemoPart,
  type DemoRecord,
  type EvaluatedReminder,
} from "@/lib/demo-garage";
import { MOD_STATUSES, modCategoryLabel, type ModStatus } from "@/lib/mod-categories";
import { describeDue, intervalUsed, type ReminderStatus } from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { AccountOnly } from "../demo-chrome";
import { DemoPhotoCredit } from "../photo-credit";
import { useDemo } from "../demo-store";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

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

// Same look as the real car pages.
const summaryClass = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";
const panelClass = "@container rounded-2xl border border-graphite bg-panel p-4 sm:p-6";
const headingClass = "font-display text-2xl font-semibold";

const statusStyle: Record<ModStatus, string> = {
  installed: "border-done/30 text-done",
  planned: "border-graphite text-chalk",
  removed: "border-graphite text-steel",
};

const SCAN_NOTE =
  "With an account, snap the shop receipt and the date, mileage, cost, shop, and parts fill in for you to check.";

const sumCost = (items: { cost: number | null }[]) =>
  items.reduce((sum, i) => sum + (i.cost ?? 0), 0);

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "build", label: "Build" },
  { id: "service", label: "Service" },
  { id: "reminders", label: "Reminders" },
  { id: "photos", label: "Photos" },
] as const;
type Tab = (typeof TABS)[number]["id"];

// The demo's tabs live in the URL hash (#service), so Back and shared links
// work without a page per tab.
const subscribeHash = (onChange: () => void) => {
  addEventListener("hashchange", onChange);
  return () => removeEventListener("hashchange", onChange);
};
function useTab(): Tab {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => location.hash.slice(1),
    () => "",
  );
  return TABS.some((t) => t.id === hash) ? (hash as Tab) : "overview";
}

// `carId` is for /demo itself, which opens on the first car the way the real
// garage opens on one car.
export function DemoCarView({ carId }: { carId?: string }) {
  const params = useParams<{ carId?: string }>();
  const demo = useDemo();
  if (!demo) return <CarSkeleton />;
  const id = carId ?? params.carId ?? demo.cars[0]?.id;
  const car = demo.cars.find((c) => c.id === id);
  if (!car) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-graphite px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">That demo car isn&apos;t here</h1>
        <Link href="/demo" className="btn btn-primary mt-6">
          Back to the demo garage
        </Link>
      </div>
    );
  }
  return <CarPage car={car} />;
}

function CarPage({ car }: { car: DemoCar }) {
  const demo = useDemo()!;
  const tab = useTab();
  const reminders = evaluateDemoReminders(car);
  const overdue = reminders.filter(({ result }) => result.status === "overdue").length;
  const dueSoon = reminders.filter(({ result }) => result.status === "due_soon").length;
  const badge =
    overdue > 0
      ? { status: "overdue" as const, label: `${overdue} overdue` }
      : dueSoon > 0
        ? { status: "due_soon" as const, label: `${dueSoon} due soon` }
        : reminders.length > 0
          ? { status: "ok" as const, label: "All caught up" }
          : null;

  return (
    <>
      <title>{`${car.nickname} · Demo garage · Revlog`}</title>
      <CarChips current={car.id} />

      <header className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
              {car.nickname}
            </h1>
            {badge && (
              <a href="#reminders" className="-my-1.5 flex min-h-11 items-center">
                <StatusBadge status={badge.status} label={badge.label} />
              </a>
            )}
          </div>
          <p className="mt-2 text-steel">{demoCarName(car)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <MileageEditor
            key={car.currentMileage}
            currentMileage={car.currentMileage}
            onSave={(miles) => demo.setMileage(car.id, miles)}
          />
          <AccountOnly message="Editing a car needs a free account.">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit car
          </AccountOnly>
        </div>
      </header>

      <nav
        aria-label="Car pages"
        className="chrome sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mt-6 border-b border-graphite/70 px-4 sm:-mx-6 sm:px-6"
      >
        <ul className="-ml-2 flex overflow-x-auto py-1 [scrollbar-width:none] sm:-ml-3 sm:gap-1">
          {TABS.map((t) => (
            <li key={t.id} className="shrink-0">
              <a
                href={`#${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                className="nav-link px-2 font-semibold sm:px-3"
              >
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        {tab === "overview" && <Overview car={car} reminders={reminders} />}
        {tab === "build" && <Build car={car} />}
        {tab === "service" && <Service car={car} reminders={reminders} />}
        {tab === "reminders" && <Reminders car={car} reminders={reminders} />}
        {tab === "photos" && <Photos car={car} />}
      </div>
    </>
  );
}

// The demo cars as a row of compact chips, like the real garage.
function CarChips({ current }: { current: string }) {
  const demo = useDemo()!;
  const chip =
    "lift flex min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-xl border py-1.5 pr-4 pl-1.5";
  return (
    <nav aria-label="Demo cars" className="-mx-4 sm:-mx-6">
      <ul className="flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:gap-3 sm:px-6">
        {demo.cars.map((c) => {
          const on = c.id === current;
          return (
            <li key={c.id} className="flex">
              <Link
                href={`/demo/${c.id}`}
                aria-current={on ? "page" : undefined}
                className={`${chip} ${on ? "border-redline bg-panel" : "border-graphite bg-panel/60 hover:border-steel"}`}
              >
                <VehiclePhoto src={c.photo.src} alt="" className="h-8 w-11 rounded-lg" />
                <span
                  className={`max-w-40 truncate text-sm font-semibold ${on ? "text-chalk" : "text-steel"}`}
                  title={demoCarName(c)}
                >
                  {c.nickname}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <AccountOnly
            align="left"
            className={`${chip} border-dashed border-graphite pl-3 text-steel hover:border-steel hover:text-chalk`}
            message="Adding your own car needs a free account. Type a VIN and the year, make, model, and trim fill in."
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="text-sm font-semibold">Add a car</span>
          </AccountOnly>
        </li>
      </ul>
    </nav>
  );
}

function Overview({ car, reminders }: { car: DemoCar; reminders: EvaluatedReminder[] }) {
  const demo = useDemo()!;
  const timeline = demoTimeline(car, demo.today, reminders);
  const installed = car.mods.filter((m) => m.status === "installed");
  const activity = [
    ...car.records.map((r) => ({
      key: `s-${r.id}`,
      date: r.servicedOn,
      title: r.title,
      detail: categoryLabel(r.category, []),
      href: "#service",
    })),
    ...car.mods
      .filter((m) => m.installedOn)
      .map((m) => ({
        key: `m-${m.id}`,
        date: m.installedOn!,
        title: modName(m),
        detail: `Mod, ${modCategoryLabel(m.category)}`,
        href: "#build",
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const stats = [
    {
      label: "Spent on service",
      value: money.format(sumCost(car.records)),
      note: `${car.records.length} ${car.records.length === 1 ? "record" : "records"}`,
      href: "#service",
    },
    {
      label: "Invested in the build",
      value: money.format(sumCost(installed)),
      note: `${installed.length} ${installed.length === 1 ? "mod" : "mods"} installed`,
      href: "#build",
    },
  ];

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className={`${panelClass} flex flex-col items-start gap-2`}>
          <ProfilePhoto src={car.photo.src} alt={demoCarName(car)} />
          <p className="text-xs text-steel">
            Photo: <DemoPhotoCredit car={car} />
          </p>
          {(car.vin || car.builtOn) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-steel">
              {car.vin && (
                <span>
                  VIN <span className="font-mono text-chalk/80">{car.vin}</span>
                </span>
              )}
              {car.builtOn && <span>Built {formatMonth(car.builtOn)}</span>}
            </p>
          )}
          <ul className="mt-auto grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl bg-graphite">
            {stats.map((s) => (
              <li key={s.label} className="flex">
                <a href={s.href} className="hover-pop group flex min-w-0 flex-1 flex-col bg-carbon p-4">
                  <span className="flex items-center justify-between gap-2 text-sm text-steel">
                    {s.label}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-steel group-hover:text-chalk"
                      aria-hidden
                    />
                  </span>
                  <span className="readout mt-2 truncate text-xl text-chalk">{s.value}</span>
                  <span className="mt-1 truncate text-sm text-steel">{s.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${panelClass} min-w-0`}>
          <h2 className={headingClass}>Mileage</h2>
          {timeline && (
            <div className="mt-4">
              <MileageChart timeline={timeline} />
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={panelClass}>
          <SectionHead title="Up next" href="#reminders" link="All reminders" />
          <ul className="mt-4 divide-y divide-rule">
            {reminders.slice(0, 4).map(({ reminder: r, result }) => (
              <li key={r.id}>
                <a
                  href="#reminders"
                  className="hover-pop -mx-3 flex items-center justify-between gap-4 rounded-xl px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.task}</p>
                    <p className="mt-0.5 text-sm text-steel">{describeDue(result)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Gauge used={intervalUsed(r, result)} status={result.status} />
                    <StatusBadge status={result.status} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={panelClass}>
          <SectionHead title="Recent activity" href="#service" link="Service history" />
          <ul className="mt-4 divide-y divide-rule">
            {activity.map((a) => (
              <li key={a.key}>
                <a
                  href={a.href}
                  className="hover-pop -mx-3 flex items-baseline gap-4 rounded-xl px-3 py-3"
                >
                  <span className="w-24 shrink-0 text-sm text-steel tabular-nums">
                    {formatDate(a.date)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.title}</span>
                    <span className="block truncate text-sm text-steel">{a.detail}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function SectionHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={headingClass}>{title}</h2>
      <a href={href} className="flex min-h-11 items-center gap-0.5 text-sm text-steel hover:text-chalk">
        {link}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}

function TabHead({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        {summary && <p className="mt-1 text-steel">{summary}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function Parts({ parts, label }: { parts: DemoPart[]; label: string }) {
  if (parts.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs text-steel">{label}</p>
      <ul className="mt-1">
        {parts.map((p) => (
          <li key={p.name} className="flex justify-between gap-3 border-t border-rule py-1.5 text-sm first:border-t-0">
            <span className="min-w-0">
              {p.name}
              {p.quantity && p.quantity > 1 && <span className="text-steel"> × {p.quantity}</span>}
            </span>
            <span className="shrink-0 text-steel tabular-nums">{money.format(p.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailsHint({ notes, parts }: { notes: boolean; parts: number }) {
  const bits = [notes && "notes", parts > 0 && `${parts} ${parts === 1 ? "part" : "parts"}`].filter(
    Boolean,
  );
  return (
    <p className="mt-1.5 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      {bits.length > 0 ? bits.join(" · ") : "Options"}
    </p>
  );
}

type Countdown = { task: string; used: number | null; status: ReminderStatus; due: string };

function Service({ car, reminders }: { car: DemoCar; reminders: EvaluatedReminder[] }) {
  const records = [...car.records].sort((a, b) => b.servicedOn.localeCompare(a.servicedOn));
  const spent = sumCost(records);
  // A reminder counts from the newest record of its type, so that record shows
  // the countdown to the next one.
  const countdowns = new Map<string, Countdown>();
  for (const { reminder, result } of reminders) {
    const latest = records.find((r) => r.category === reminder.serviceCategory);
    if (!latest || countdowns.has(latest.id) || result.status === "unknown") continue;
    countdowns.set(latest.id, {
      task: reminder.task,
      used: intervalUsed(reminder, result),
      status: result.status,
      due: describeDue(result),
    });
  }
  const years = new Map<string, DemoRecord[]>();
  for (const r of records) {
    const y = r.servicedOn.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), r]);
  }

  return (
    <>
      <TabHead
        title="Service history"
        summary={`${records.length} ${records.length === 1 ? "record" : "records"}${spent > 0 ? `, ${money.format(spent)} spent` : ""}`}
      >
        <AccountOnly
          title="Download service history as a PDF"
          message="With an account, download a printable PDF of the whole history to hand the next owner."
        >
          <Download className="h-4 w-4" aria-hidden />
          PDF
        </AccountOnly>
        <AccountOnly className="btn btn-primary" message={SCAN_NOTE}>
          <Plus className="h-4 w-4" aria-hidden />
          Log service
        </AccountOnly>
      </TabHead>
      <section className={`${panelClass} mt-6 space-y-6`}>
        {[...years].map(([year, list]) => (
          <div key={year}>
            <h3 className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <span className="font-display text-xl font-semibold">{year}</span>
              <span className="text-sm text-steel">
                {list.length} {list.length === 1 ? "record" : "records"}
                {sumCost(list) > 0 && `, ${money.format(sumCost(list))}`}
              </span>
            </h3>
            <ol className="mt-3 divide-y divide-rule">
              {list.map((r) => (
                <ServiceRow key={r.id} record={r} countdown={countdowns.get(r.id)} />
              ))}
            </ol>
          </div>
        ))}
      </section>
    </>
  );
}

function ServiceRow({ record: r, countdown: c }: { record: DemoRecord; countdown?: Countdown }) {
  const chips = [
    categoryLabel(r.category, []),
    r.mileage != null && `${r.mileage.toLocaleString("en-US")} mi`,
    r.shop,
    r.parts.length > 0 && `${r.parts.length} ${r.parts.length === 1 ? "part" : "parts"}`,
  ].filter(Boolean) as string[];
  return (
    <li className="hover-pop -mx-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 rounded-xl px-3 py-5 @md:grid-cols-[8rem_minmax(0,1fr)_auto]">
      <div className="col-span-2 font-display text-sm text-steel tabular-nums @md:col-span-1 @md:pt-0.5">
        {formatDate(r.servicedOn)}
      </div>
      <details className="group min-w-0">
        <summary className={summaryClass}>
          <p className="font-semibold">{r.title}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="rounded-md bg-graphite/70 px-2 py-0.5 text-sm text-steel">
                {chip}
              </span>
            ))}
          </p>
          {c && (
            <span className="mt-3 flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-carbon px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
              <Gauge used={c.used} status={c.status} />
              <span className="text-sm text-steel">
                {c.task}: {c.due.charAt(0).toLowerCase() + c.due.slice(1)}
              </span>
            </span>
          )}
          <DetailsHint notes={!!r.notes} parts={0} />
        </summary>
        {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
        <Parts parts={r.parts} label="Parts used" />
        <div className="mt-2 -ml-2 flex items-center">
          <AccountOnly
            align="left"
            className="icon-btn"
            aria-label="Copy record"
            title="Log again (copies parts too)"
            message="Copying a record into a new one needs a free account."
          >
            <Copy className="h-4 w-4" aria-hidden />
          </AccountOnly>
          <AccountOnly
            align="left"
            className="icon-btn"
            aria-label="Edit record"
            title="Edit record"
            message="Editing records needs a free account."
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </AccountOnly>
        </div>
      </details>
      <span className="readout text-right text-xl text-chalk">
        {r.cost ? money.format(r.cost) : ""}
      </span>
    </li>
  );
}

const dueColor = (status: ReminderStatus) =>
  status === "overdue"
    ? "text-overdue"
    : status === "due_soon"
      ? "text-due"
      : status === "ok"
        ? "text-gauge"
        : "text-steel";

function Reminders({ car, reminders }: { car: DemoCar; reminders: EvaluatedReminder[] }) {
  const attention = reminders.filter(({ result }) => result.status !== "ok");
  const onTrack = reminders.filter(({ result }) => result.status === "ok");
  return (
    <>
      <TabHead
        title="Reminders"
        summary={
          attention.length === 0
            ? `${reminders.length} reminders, all caught up`
            : `${attention.length} of ${reminders.length} need attention`
        }
      >
        <AccountOnly
          className="btn btn-primary"
          message="With an account, pick a service and the interval fills in. Revlog emails you before it's due."
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add reminder
        </AccountOnly>
      </TabHead>
      <div className="mt-6 space-y-6">
        {attention.length > 0 && (
          <ReminderGroup title="Needs attention" tone="attention" items={attention} car={car} />
        )}
        {onTrack.length > 0 && (
          <ReminderGroup title="On track" tone="ok" items={onTrack} car={car} />
        )}
      </div>
    </>
  );
}

function ReminderGroup({
  title,
  tone,
  items,
  car,
}: {
  title: string;
  tone: "attention" | "ok";
  items: EvaluatedReminder[];
  car: DemoCar;
}) {
  const demo = useDemo()!;
  return (
    <section>
      <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold">
        <span
          className={`h-2.5 w-2.5 rounded-full ${tone === "attention" ? "bg-overdue" : "bg-gauge"}`}
          aria-hidden
        />
        {title}
        <span className="font-sans text-sm font-normal text-steel">{items.length}</span>
      </h3>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ reminder: r, result }) => (
          <li
            key={r.id}
            className="hover-pop flex flex-col gap-3 rounded-2xl border border-graphite bg-panel p-4 sm:p-5"
          >
            <div className="flex items-center gap-4">
              <MiniDial used={intervalUsed(r, result)} status={result.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold">{r.task}</p>
                <p className="mt-1 text-sm text-steel">
                  Every{" "}
                  {[
                    r.intervalMiles && `${r.intervalMiles.toLocaleString("en-US")} mi`,
                    r.intervalMonths &&
                      `${r.intervalMonths} ${r.intervalMonths === 1 ? "month" : "months"}`,
                  ]
                    .filter(Boolean)
                    .join(" or ")}
                </p>
                <p className="text-sm text-steel">
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
                <p className={`mt-1 text-sm font-semibold ${dueColor(result.status)}`}>
                  {describeDue(result)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => demo.markDone(car.id, r.id)}
                className="btn shrink-0"
                aria-label={`Mark ${r.task} done today at ${car.currentMileage.toLocaleString("en-US")} miles`}
              >
                <Check className="h-4 w-4" aria-hidden />
                Done
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const GROUPS = [
  { status: "installed", title: "Installed", empty: "Nothing installed yet." },
  { status: "planned", title: "Planned", empty: "No plans yet." },
  { status: "removed", title: "Removed", empty: null },
] as const;

function Build({ car }: { car: DemoCar }) {
  const demo = useDemo()!;
  const installed = car.mods.filter((m) => m.status === "installed");
  const planned = car.mods.filter((m) => m.status === "planned");
  const count = installed.length + planned.length;
  const spent = sumCost(installed);
  const total = spent + sumCost(planned);
  const move = (modId: string, status: ModStatus) => demo.setModStatus(car.id, modId, status);

  return (
    <>
      <TabHead
        title="Build"
        summary={[
          `${installed.length} installed`,
          spent > 0 && `${money.format(spent)} invested`,
          sumCost(planned) > 0 && `${money.format(sumCost(planned))} planned`,
        ]
          .filter(Boolean)
          .join(", ")}
      >
        <AccountOnly message="With an account, post your installed mods, photos, and part links as one public build page.">
          <Share2 className="h-4 w-4" aria-hidden />
          Post public build
        </AccountOnly>
        <AccountOnly
          className="btn btn-primary"
          message="With an account, screenshot an order email or product page and the mod, brand, price, and parts fill in."
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add mod
        </AccountOnly>
      </TabHead>

      {count > 0 && (
        <section className={`${panelClass} mt-6 grid gap-6 sm:grid-cols-2`}>
          <div>
            <p className="flex items-baseline justify-between gap-3 text-sm text-steel">
              Build plan
              <span className="readout text-2xl text-chalk">
                {installed.length} <span className="text-base text-steel">of {count} in</span>
              </span>
            </p>
            <div className="mt-3">
              <Gauge
                used={installed.length / count}
                status="ok"
                wide
                label={`${installed.length} of ${count} mods installed`}
              />
            </div>
          </div>
          {total > 0 && (
            <div>
              <p className="flex items-baseline justify-between gap-3 text-sm text-steel">
                Invested
                <span className="readout text-2xl text-chalk">
                  {money.format(spent)}{" "}
                  <span className="text-base text-steel">of {money.format(total)}</span>
                </span>
              </p>
              <div className="mt-3">
                <Gauge
                  used={spent / total}
                  status="ok"
                  wide
                  label={`${money.format(spent)} of ${money.format(total)} spent`}
                />
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        {GROUPS.map((group) => {
          const list = car.mods.filter((m) => m.status === group.status);
          if (list.length === 0 && !group.empty) return null;
          const cost = sumCost(list);
          return (
            <ModDropZone
              key={group.status}
              vehicleId={car.id}
              status={group.status}
              onMove={move}
              className={`${panelClass} ${group.status === "removed" ? "lg:col-span-2" : ""}`}
            >
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex items-baseline gap-2 font-display text-xl font-semibold">
                  {group.title}
                  <span className="font-sans text-sm font-normal text-steel">{list.length}</span>
                </span>
                {cost > 0 && <span className="text-sm text-steel">{money.format(cost)}</span>}
              </h3>
              {list.length === 0 ? (
                <p className="mt-3 text-sm text-steel">
                  {group.empty} Or drag a mod here from the other list.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-rule">
                  {list.map((m) => (
                    <ModRow key={m.id} mod={m} onStatus={(s) => move(m.id, s)} />
                  ))}
                </ul>
              )}
            </ModDropZone>
          );
        })}
      </div>
    </>
  );
}

function ModRow({ mod: m, onStatus }: { mod: DemoMod; onStatus: (status: ModStatus) => void }) {
  const summary = (
    <>
      <p className={`font-semibold ${m.status === "removed" ? "text-steel line-through" : ""}`}>
        {modName(m)}
      </p>
      <p className="mt-0.5 text-sm text-steel">
        {[
          modCategoryLabel(m.category),
          m.installedOn && formatDate(m.installedOn),
          m.installedMileage != null && `${m.installedMileage.toLocaleString("en-US")} mi`,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
    </>
  );
  return (
    <DraggableMod
      modId={m.id}
      status={m.status}
      className="hover-pop -mx-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 rounded-xl px-3 py-4"
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
          m.status === "installed"
            ? "bg-done"
            : m.status === "planned"
              ? "shadow-[inset_0_0_0_2px_var(--color-edge)]"
              : "bg-graphite"
        }`}
        aria-hidden
      />
      {m.notes || m.parts.length > 0 ? (
        <details className="group min-w-0">
          <summary className={summaryClass}>
            {summary}
            <DetailsHint notes={!!m.notes} parts={m.parts.length} />
          </summary>
          {m.notes && <p className="mt-2 whitespace-pre-line text-sm">{m.notes}</p>}
          <Parts parts={m.parts} label={m.status === "planned" ? "Parts wanted" : "Parts used"} />
        </details>
      ) : (
        <div className="min-w-0">{summary}</div>
      )}
      <span className="readout text-right text-xl text-chalk">
        {m.cost ? money.format(m.cost) : ""}
      </span>
      <div className="col-start-2 col-end-4 -ml-1 flex flex-wrap items-center gap-1">
        <select
          value={m.status}
          aria-label={`Status of ${modName(m)}`}
          onChange={(e) => onStatus(e.target.value as ModStatus)}
          className={`min-h-8 cursor-pointer rounded-md border bg-carbon px-2 text-xs font-semibold ${statusStyle[m.status]}`}
        >
          {MOD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </DraggableMod>
  );
}

function Photos({ car }: { car: DemoCar }) {
  return (
    <>
      <TabHead title="Photos" summary="1 photo">
        <AccountOnly
          className="btn btn-primary"
          message="With an account, add photos to the car, each service, and each mod."
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add photos
        </AccountOnly>
      </TabHead>
      <section className={`${panelClass} mt-6`}>
        <h3 className={headingClass}>Build</h3>
        <div className="mt-4 max-w-md">
          <ProfilePhoto src={car.photo.src} alt={demoCarName(car)} />
          <p className="mt-2 text-xs text-steel">
            Photo: <DemoPhotoCredit car={car} />
          </p>
        </div>
      </section>
    </>
  );
}

// Click the odometer to change it, like the real car page.
function MileageEditor({
  currentMileage,
  onSave,
}: {
  currentMileage: number;
  onSave: (miles: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group -mx-2 flex items-baseline gap-2 rounded-md px-2 py-1 text-left hover:bg-panel"
        title="Update mileage"
        aria-label={`Odometer ${currentMileage.toLocaleString("en-US")} miles, update mileage`}
      >
        <span className="readout text-5xl leading-none">{currentMileage.toLocaleString("en-US")}</span>
        <span className="text-sm text-steel">mi</span>
        <Pencil className="h-4 w-4 self-center text-steel opacity-60 group-hover:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("currentMileage") ?? "");
        const miles = Number(raw.replace(/[,\s]/g, ""));
        if (!Number.isInteger(miles) || miles < 0) {
          setError("Enter the odometer as a whole number of miles.");
          return;
        }
        if (miles < currentMileage) {
          setError(`Enter ${currentMileage.toLocaleString("en-US")} mi or more.`);
          return;
        }
        onSave(miles);
        setEditing(false);
      }}
    >
      <div className="flex items-center gap-2">
        <input
          name="currentMileage"
          inputMode="numeric"
          autoFocus
          defaultValue={currentMileage.toString()}
          aria-label="Current mileage"
          aria-invalid={!!error}
          onChange={() => setError(null)}
          className="field readout w-36 text-2xl"
        />
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn border-transparent text-steel hover:text-chalk"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-overdue">
          {error}
        </p>
      )}
    </form>
  );
}

export function CarSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading car">
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-11 w-36 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 flex items-end justify-between gap-6">
        <div className="skeleton h-12 w-2/3 max-w-md" />
        <div className="skeleton h-10 w-40" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="skeleton h-80 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </div>
  );
}
