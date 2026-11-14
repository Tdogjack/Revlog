import Link from "next/link";
import { Suspense } from "react";
import { ChevronDown, Download, FileUp, Plus, Search, Wrench } from "lucide-react";
import { cardClass, RecordStats } from "@/components/record-stats";
import { listPartsForVehicle } from "@/lib/parts";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import {
  dateClass,
  formatDate,
  loadCar,
  loadGallery,
  money,
  panelClass,
  ServiceRow,
  summaryClass,
  sumCost,
  TabHead,
  TabSkeleton,
  type ServiceRecord,
} from "../shared";

// The car's full service history. By date groups it into years; by type
// puts each kind of service together with the last time it was done on top.
export default function ServicePage({ params, searchParams }: PageProps<"/garage/[id]/service">) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <ServiceHistory params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ServiceHistory({
  params,
  searchParams,
}: Pick<PageProps<"/garage/[id]/service">, "params" | "searchParams">) {
  const { user, car } = await loadCar(params);
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const byType = query.view === "type";

  const [records, customTypes, parts, pickPhotos] = await Promise.all([
    listServiceRecords(user.id, car.id),
    listServiceTypes(user.id),
    listPartsForVehicle(user.id, car.id),
    loadGallery(user.id, car.id),
  ]);

  const needle = q.toLowerCase();
  const shown = needle
    ? records.filter((r) =>
        [r.title, categoryLabel(r.category, customTypes), r.shop, r.notes]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(needle)),
      )
    : records;

  const base = `/garage/${car.id}`;
  const spent = sumCost(records);
  const row = (r: ServiceRecord) => (
    <ServiceRow
      key={r.id}
      vehicleId={car.id}
      record={r}
      customTypes={customTypes}
      parts={parts.filter((p) => p.serviceRecordId === r.id)}
      photos={pickPhotos((p) => p.serviceRecordId === r.id)}
    />
  );
  const viewHref = (view: "date" | "type") => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (view === "type") sp.set("view", "type");
    const s = sp.toString();
    return `${base}/service${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <TabHead
        title="Service history"
        summary={
          records.length === 0
            ? "Every oil change, repair, and inspection, with what it cost."
            : `${records.length} ${records.length === 1 ? "record" : "records"}${
                spent > 0 ? `, ${money.format(spent)} spent` : ""
              }`
        }
      >
        {records.length > 0 && (
          <a href={`${base}/history`} className="btn" title="Download service history as a PDF">
            <Download className="h-4 w-4" aria-hidden />
            PDF
          </a>
        )}
        <Link
          href={`${base}/service/import`}
          className="btn"
          title="Add past services from photos, PDFs, or a spreadsheet"
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Import
        </Link>
        <Link href={`${base}/service/new`} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          Log service
        </Link>
      </TabHead>

      <section className={`${panelClass} mt-6`}>
        {records.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
            <form
              action={`${base}/service`}
              className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-sm sm:flex-1"
            >
              {byType && <input type="hidden" name="view" value="type" />}
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search service history</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search services, shops, notes"
                  className="field pl-9"
                />
              </label>
              <button type="submit" className="btn">
                Search
              </button>
            </form>
            <div className="segmented" role="group" aria-label="Group records">
              <Link
                href={viewHref("date")}
                aria-pressed={!byType}
                className="segment inline-flex items-center"
              >
                By date
              </Link>
              <Link
                href={viewHref("type")}
                aria-pressed={byType}
                className="segment inline-flex items-center"
              >
                By type
              </Link>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div className="py-10 text-center">
            <Wrench className="mx-auto h-8 w-8 text-steel" aria-hidden />
            <h3 className="mt-4 font-display text-2xl font-semibold">No service records yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-steel">
              Log your last oil change to start the timeline, or import past services from receipts
              or a spreadsheet all at once.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={`${base}/service/new`} className="btn btn-primary">
                Log service
              </Link>
              <Link href={`${base}/service/import`} className="btn">
                Import past services
              </Link>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-steel">
            No records match &ldquo;{q}&rdquo;.{" "}
            <Link
              href={`${base}/service${byType ? "?view=type" : ""}`}
              className="text-chalk underline underline-offset-2"
            >
              Clear search
            </Link>
          </p>
        ) : byType ? (
          <ol className="mt-4 space-y-2">
            {groupByType(shown).map((group) =>
              group.length === 1 ? (
                row(group[0])
              ) : (
                <li key={group[0].category} className={cardClass}>
                  <details className="group/type">
                    <summary className={`${summaryClass} flex flex-col gap-1 @md:flex-row @md:gap-4`}>
                      <div className={dateClass}>{formatDate(group[0].servicedOn)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{categoryLabel(group[0].category, customTypes)}</p>
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
                    <ol className="mt-3 space-y-2">{group.map(row)}</ol>
                  </details>
                </li>
              ),
            )}
          </ol>
        ) : (
          <div className="space-y-8 pt-4">
            {groupByYear(shown).map(([year, list]) => (
              <div key={year}>
                <h3 className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                  <span className="font-display text-xl font-semibold">{year}</span>
                  <span className="text-sm text-steel">
                    {list.length} {list.length === 1 ? "record" : "records"}
                    {sumCost(list) > 0 && `, ${money.format(sumCost(list))}`}
                  </span>
                </h3>
                <ol className="mt-3 space-y-2">{list.map(row)}</ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// Records arrive newest first, so each group's first record is the last time
// that service was done.
function groupByType(records: ServiceRecord[]) {
  const groups = new Map<string, ServiceRecord[]>();
  for (const r of records) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return [...groups.values()];
}

function groupByYear(records: ServiceRecord[]) {
  const groups = new Map<string, ServiceRecord[]>();
  for (const r of records) {
    const year = r.servicedOn.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), r]);
  }
  return [...groups.entries()];
}
