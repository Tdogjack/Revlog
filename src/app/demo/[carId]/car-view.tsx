"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Copy, Download, Pencil, Plus, Share2 } from "lucide-react";
import { MileageChart } from "@/components/mileage-chart";
import { cardClass, RecordStats, reminderEdge } from "@/components/record-stats";
import { StatusBadge } from "@/components/status-badge";
import { ProfilePhoto } from "@/app/garage/[id]/profile-photo";
import {
  demoCarName,
  demoTimeline,
  evaluateDemoReminders,
  modName,
  type DemoCar,
  type DemoPart,
  type DemoRecord,
} from "@/lib/demo-garage";
import { MOD_STATUSES, modCategoryLabel, type ModStatus } from "@/lib/mod-categories";
import { describeDue } from "@/lib/reminders";
import { categoryLabel } from "@/lib/service-categories";
import { AccountOnly } from "../demo-chrome";
import { DemoPhotoCredit } from "../garage-list";
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

// Same look as the real car page.
const summaryClass = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";
const panelClass = "rounded-lg border border-graphite bg-panel p-5 sm:p-6";
const sectionHeadClass = "flex flex-wrap items-start justify-between gap-3";
const headingClass = "font-display text-2xl leading-tight font-semibold";
const dateClass = "shrink-0 pt-0.5 text-sm text-steel tabular-nums sm:w-24";

const statusStyle: Record<ModStatus, string> = {
  installed: "border-done/30 text-done",
  planned: "border-graphite text-chalk",
  removed: "border-graphite text-steel",
};

const SCAN_NOTE =
  "With an account, snap the shop receipt and the date, mileage, cost, shop, and parts fill in for you to check.";

const sumCost = (items: { cost: number | null }[]) =>
  items.reduce((sum, i) => sum + (i.cost ?? 0), 0);

function groupByType(records: DemoRecord[]) {
  const groups = new Map<string, DemoRecord[]>();
  for (const r of records) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return [...groups.values()];
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

export function DemoCarView() {
  const { carId } = useParams<{ carId: string }>();
  const demo = useDemo();
  if (!demo) return <CarSkeleton />;
  const car = demo.cars.find((c) => c.id === carId);
  if (!car) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-graphite px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">That demo car isn&apos;t here</h1>
        <Link href="/demo" className="btn btn-primary mt-6">
          Back to the demo garage
        </Link>
      </div>
    );
  }
  return <CarDetails car={car} />;
}

function CarDetails({ car }: { car: DemoCar }) {
  const demo = useDemo()!;
  const reminders = evaluateDemoReminders(car);
  const timeline = demoTimeline(car, demo.today, reminders);
  const installed = car.mods.filter((m) => m.status === "installed");
  const totalSpent = sumCost(car.records);
  const installedSpent = sumCost(installed);
  const plannedCost = sumCost(car.mods.filter((m) => m.status === "planned"));

  const renderRecord = (r: DemoRecord) => (
    <li key={r.id} className={`${cardClass} flex flex-col gap-1 border-l-chart-service sm:flex-row sm:gap-4`}>
      <div className={dateClass}>{formatDate(r.servicedOn)}</div>
      <details className="group min-w-0 flex-1">
        <summary className={summaryClass}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-steel">{categoryLabel(r.category, [])}</p>
          </div>
          <RecordStats miles={r.mileage} cost={r.cost} extra={[r.shop]} />
          <DetailsHint notes={!!r.notes} parts={r.parts.length} />
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
    </li>
  );

  return (
    <>
      <title>{`${car.nickname} · Demo garage · Revlog`}</title>
      <header className="mt-6 flex flex-col gap-6 border-b border-graphite pb-8 sm:flex-row sm:items-end">
        <div className="flex flex-col items-start gap-2">
          <ProfilePhoto src={car.photo.src} alt={demoCarName(car)} />
          <p className="text-xs text-steel">
            Photo: <DemoPhotoCredit car={car} />
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:pb-8">
          <div>
            <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
              {car.nickname}
            </h1>
            <p className="mt-2 text-steel">{demoCarName(car)}</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <MileageEditor
              key={car.currentMileage}
              currentMileage={car.currentMileage}
              onSave={(miles) => demo.setMileage(car.id, miles)}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {car.vin && (
                <p className="text-xs text-steel">
                  VIN <span className="font-mono text-chalk/80">{car.vin}</span>
                </p>
              )}
              {car.builtOn && <p className="text-xs text-steel">Built {formatMonth(car.builtOn)}</p>}
              <AccountOnly message="Editing a car needs a free account.">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit car
              </AccountOnly>
            </div>
          </div>
        </div>
      </header>

      <section className={`${panelClass} mt-8`}>
        <h2 className={headingClass}>Mileage</h2>
        {timeline && (
          <div className="mt-4">
            <MileageChart timeline={timeline} />
          </div>
        )}
      </section>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <div>
                <h2 className={headingClass}>Service history</h2>
                <p className="mt-1 text-sm text-steel">
                  {car.records.length} {car.records.length === 1 ? "record" : "records"}
                  {totalSpent > 0 && `, ${money.format(totalSpent)} spent`}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {groupByType(car.records).map((group) =>
                group.length === 1 ? (
                  renderRecord(group[0])
                ) : (
                  <li key={group[0].category} className={`${cardClass} border-l-chart-service`}>
                    <details className="group/type">
                      <summary
                        className={`${summaryClass} flex flex-col gap-1 sm:flex-row sm:gap-4`}
                      >
                        <div className={dateClass}>{formatDate(group[0].servicedOn)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{categoryLabel(group[0].category, [])}</p>
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
          </section>

          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <div>
                <h2 className={headingClass}>Build</h2>
                <p className="mt-1 text-sm text-steel">
                  {[
                    `${installed.length} installed`,
                    installedSpent > 0 && `${money.format(installedSpent)} invested`,
                    plannedCost > 0 && `${money.format(plannedCost)} planned`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AccountOnly message="With an account, post your installed mods, photos, and part links as one public build page.">
                  <Share2 className="h-4 w-4" aria-hidden />
                  Post public build
                </AccountOnly>
                <AccountOnly message="With an account, screenshot an order email or product page and the mod, brand, price, and parts fill in.">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add mod
                </AccountOnly>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {car.mods.map((m) => {
                const summary = (
                  <>
                    <p className={`font-semibold ${m.status === "removed" ? "text-steel line-through" : ""}`}>
                      {modName(m)}
                    </p>
                    <RecordStats
                          miles={m.installedMileage}
                          cost={m.cost}
                          extra={[modCategoryLabel(m.category), m.installedOn && formatDate(m.installedOn)]}
                        />
                  </>
                );
                return (
                  <li key={m.id} className={`${cardClass} flex flex-col gap-2 sm:flex-row sm:gap-4 ${m.status === "removed" ? "border-l-graphite" : "border-l-chart-mods"}`}>
                    {m.notes || m.parts.length > 0 ? (
                      <details className="group min-w-0 flex-1">
                        <summary className={summaryClass}>
                          {summary}
                          <DetailsHint notes={!!m.notes} parts={m.parts.length} />
                        </summary>
                        {m.notes && <p className="mt-2 whitespace-pre-line text-sm">{m.notes}</p>}
                        <Parts parts={m.parts} label={m.status === "planned" ? "Parts wanted" : "Parts used"} />
                      </details>
                    ) : (
                      <div className="min-w-0 flex-1">{summary}</div>
                    )}
                    <div className="-ml-1 flex items-center gap-1 sm:ml-0 sm:flex-col sm:items-end">
                      <select
                        value={m.status}
                        aria-label={`Status of ${modName(m)}`}
                        onChange={(e) => demo.setModStatus(car.id, m.id, e.target.value as ModStatus)}
                        className={`min-h-8 cursor-pointer rounded-md border bg-carbon px-2 text-xs font-semibold ${statusStyle[m.status]}`}
                      >
                        {MOD_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className={panelClass}>
            <div className={sectionHeadClass}>
              <h2 className={headingClass}>Reminders</h2>
              <AccountOnly message="With an account, pick a service and the interval fills in. Revlog emails you before it's due.">
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </AccountOnly>
            </div>
            <ul className="mt-4 space-y-2">
              {reminders.map(({ reminder: r, result }) => (
                <li key={r.id} className={`${cardClass} flex gap-3 ${reminderEdge[result.status]}`}>
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
                          {r.lastDoneMileage != null && ` at ${r.lastDoneMileage.toLocaleString("en-US")} mi`}
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
                  </details>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={result.status} />
                    <button
                      type="button"
                      onClick={() => demo.markDone(car.id, r.id)}
                      className="btn min-h-8 px-2.5 text-xs"
                      aria-label={`Mark ${r.task} done today at ${car.currentMileage.toLocaleString("en-US")} miles`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Done
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
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
