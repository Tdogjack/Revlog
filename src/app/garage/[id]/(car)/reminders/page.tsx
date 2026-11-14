import Link from "next/link";
import { Suspense } from "react";
import { BellRing, Check, ChevronDown, Plus } from "lucide-react";
import { cardClass } from "@/components/record-stats";
import { RowSizeToggle } from "@/components/row-size-toggle";
import { StatusBadge } from "@/components/status-badge";
import { getEmailSettings } from "@/lib/email-settings";
import { listReminders } from "@/lib/reminder-store";
import { describeDue, rankReminders } from "@/lib/reminders";
import { listServiceRecords } from "@/lib/service-records";
import { ReminderControls } from "../../reminder-controls";
import { markNeverDone } from "../../reminders/actions";
import type { RowSize } from "@/lib/row-size";
import {
  formatDate,
  getRowSize,
  loadCar,
  panelClass,
  RowChevron,
  smallCardClass,
  summaryClass,
  TabHead,
  TabSkeleton,
} from "../shared";

// Everything on a schedule for this car, the ones that need doing first.
export default function RemindersPage({
  params,
}: PageProps<"/garage/[id]/reminders">) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <Reminders params={params} />
    </Suspense>
  );
}

type Row = Awaited<ReturnType<typeof listReminders>>[number];
type Ranked = ReturnType<typeof rankReminders<Row>>[number];

async function Reminders({
  params,
}: Pick<PageProps<"/garage/[id]/reminders">, "params">) {
  const { user, car } = await loadCar(params);
  const [rows, records, settings, size] = await Promise.all([
    listReminders(user.id, car.id),
    listServiceRecords(user.id, car.id),
    getEmailSettings(user.id),
    getRowSize("reminders"),
  ]);
  // Each reminder counts from its latest matching service record, or the
  // car's age if it's never been done; most urgent first.
  const ranked = rankReminders(rows, car, records, {
    dueSoonPercent: settings.reminderPercent,
  });
  const attention = ranked.filter(({ result }) => result.status !== "ok");
  const onTrack = ranked.filter(({ result }) => result.status === "ok");
  const base = `/garage/${car.id}`;

  const summary =
    ranked.length === 0
      ? "Oil changes, rotations, and anything else on a schedule."
      : attention.length === 0
        ? `${ranked.length} ${ranked.length === 1 ? "reminder" : "reminders"}, all caught up`
        : `${attention.length} of ${ranked.length} need attention`;

  return (
    <>
      <TabHead title="Reminders" summary={summary}>
        {ranked.length > 0 && <RowSizeToggle list="reminders" size={size} />}
        <Link href={`${base}/reminders/new`} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          Add reminder
        </Link>
      </TabHead>

      {ranked.length === 0 ? (
        <section className={`${panelClass} mt-6 py-10 text-center`}>
          <BellRing className="mx-auto h-8 w-8 text-steel" aria-hidden />
          <h3 className="mt-4 font-display text-2xl font-semibold">
            No reminders set
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-steel">
            Add one and Revlog tracks it by miles and months, counting from the
            last time you logged it.
          </p>
          <Link href={`${base}/reminders/new`} className="btn btn-primary mt-6">
            Add reminder
          </Link>
        </section>
      ) : (
        <div className="mt-6 space-y-6">
          {attention.length > 0 && (
            <Group
              title="Needs attention"
              items={attention}
              vehicleId={car.id}
              size={size}
            />
          )}
          {onTrack.length > 0 && (
            <Group
              title="On track"
              items={onTrack}
              vehicleId={car.id}
              size={size}
            />
          )}
        </div>
      )}
    </>
  );
}

function Group({
  title,
  items,
  vehicleId,
  size,
}: {
  title: string;
  items: Ranked[];
  vehicleId: string;
  size: RowSize;
}) {
  return (
    <section className={panelClass}>
      <h3 className="flex items-baseline gap-2 font-display text-xl font-semibold">
        {title}
        <span className="font-sans text-sm font-normal text-steel">
          {items.length}
        </span>
      </h3>
      <ul className={`mt-4 ${size === "small" ? "space-y-1.5" : "space-y-2"}`}>
        {items.map((item) =>
          size === "small" ? (
            <SmallReminder
              key={item.reminder.id}
              item={item}
              vehicleId={vehicleId}
            />
          ) : (
            <ReminderCard
              key={item.reminder.id}
              item={item}
              vehicleId={vehicleId}
            />
          ),
        )}
      </ul>
    </section>
  );
}

const dueColor = (status: Ranked["result"]["status"]) =>
  status === "overdue"
    ? "text-overdue"
    : status === "due_soon"
      ? "text-due"
      : "text-steel";

// When it was last done and how often it repeats.
function ReminderFacts({ item: { reminder: r, result } }: { item: Ranked }) {
  return (
    <>
      <p className="mt-2 text-xs text-steel">
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
    </>
  );
}

// The whole reminder on one line: task, when it's due, and Done. Its history,
// edit buttons, and the not-logged choices open underneath.
function SmallReminder({
  item,
  vehicleId,
}: {
  item: Ranked;
  vehicleId: string;
}) {
  const { reminder: r, result } = item;
  const logHref = `/garage/${vehicleId}/service/new?reminder=${r.id}`;
  return (
    <li className={`${smallCardClass} flex items-start gap-3`}>
      <details className="group min-w-0 flex-1">
        <summary className={`${summaryClass} flex min-h-8 items-center gap-3`}>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {r.task}
          </span>
          <span
            className={`hidden shrink-0 text-sm font-semibold @md:inline ${dueColor(result.status)}`}
          >
            {describeDue(result)}
          </span>
          <StatusBadge status={result.status} />
          <RowChevron />
        </summary>
        <p
          className={`mt-2 text-sm font-semibold @md:hidden ${dueColor(result.status)}`}
        >
          {describeDue(result)}
        </p>
        <ReminderFacts item={item} />
        {result.status === "unknown" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={logHref} className="btn">
              Log service
            </Link>
            <form action={markNeverDone.bind(null, vehicleId, r.id)}>
              <button type="submit" className="btn">
                Never done
              </button>
            </form>
          </div>
        )}
        <ReminderControls vehicleId={vehicleId} reminderId={r.id} />
      </details>
      {result.status !== "unknown" && (
        <Link href={logHref} className="btn min-h-8 shrink-0 px-2.5 text-xs">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Done
        </Link>
      )}
    </li>
  );
}

function ReminderCard({
  item: { reminder: r, result },
  vehicleId,
}: {
  item: Ranked;
  vehicleId: string;
}) {
  const logHref = `/garage/${vehicleId}/service/new?reminder=${r.id}`;
  return (
    <li className={`${cardClass} flex flex-wrap content-start gap-3`}>
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
          <p className="mt-1.5 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              aria-hidden
            />
            Details
          </p>
        </summary>
        <p className="mt-2 text-xs text-steel">
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
        <ReminderControls vehicleId={vehicleId} reminderId={r.id} />
      </details>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge status={result.status} />
        {/* Opens Log service with this reminder's type filled in. */}
        {result.status !== "unknown" && (
          <Link href={logHref} className="btn min-h-8 px-2.5 text-xs">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </Link>
        )}
      </div>
      {result.status === "unknown" && (
        <div className="grid basis-full grid-cols-2 gap-2">
          <Link href={logHref} className="btn">
            Log service
          </Link>
          <form action={markNeverDone.bind(null, vehicleId, r.id)}>
            <button type="submit" className="btn w-full">
              Never done
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
