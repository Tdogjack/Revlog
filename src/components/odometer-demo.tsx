"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { MileageChart } from "@/components/mileage-chart";
import { StatusBadge } from "@/components/status-badge";
import { daysBefore, demoEvents, demoTrackCar } from "@/lib/demo-garage";
import { buildMileageTimeline, DAY } from "@/lib/mileage-timeline";
import type { ReminderStatus } from "@/lib/reminders";
import { useToday } from "@/lib/use-today";

const START_MILES = 48_210;
const MAX_DRIVE = 8_000;
// Revlog's default "due soon" window when no percent is set.
const DUE_SOON_MILES = 500;
// The M3's usual pace, so driving also moves the graph's calendar ahead.
const MILES_PER_DAY = 15.4;
// How far past the last mile driven the dashed projection runs.
const AHEAD_DAYS = 120;

type DemoReminder = { task: string; every: number; lastAt: number };

const START_REMINDERS: DemoReminder[] = [
  { task: "Oil change", every: 5_000, lastAt: 43_620 },
  { task: "Brake fluid", every: 20_000, lastAt: 31_200 },
  { task: "Diff fluid", every: 15_000, lastAt: 38_540 },
  { task: "Spark plugs", every: 60_000, lastAt: 0 },
];

type DemoStatus = Exclude<ReminderStatus, "unknown">;

function evaluate(r: DemoReminder, miles: number) {
  const left = r.lastAt + r.every - miles;
  const status: DemoStatus = left < 0 ? "overdue" : left <= DUE_SOON_MILES ? "due_soon" : "ok";
  const used = Math.min(1, Math.max(0, (miles - r.lastAt) / r.every));
  const text =
    left < 0
      ? `Overdue by ${(-left).toLocaleString("en-US")} mi`
      : `Due in ${left.toLocaleString("en-US")} mi`;
  return { status, used, text };
}

const barTone: Record<DemoStatus, string> = {
  ok: "bg-steel",
  due_soon: "bg-due",
  overdue: "bg-overdue",
};
const textTone: Record<DemoStatus, string> = {
  ok: "text-steel",
  due_soon: "text-due",
  overdue: "text-overdue",
};

type Done = { task: string; miles: number; date: string };

// A playable slice of a car page: drive miles with the slider and watch the
// reminders count down and the graph grow, then mark one done to reset it
// from today's miles.
export function OdometerDemo() {
  const today = useToday();
  const [driven, setDriven] = useState(0);
  const [reminders, setReminders] = useState(START_REMINDERS);
  const [done, setDone] = useState<Done[]>([]);
  const miles = START_MILES + driven;
  const results = reminders.map((r) => ({ r, ...evaluate(r, miles) }));
  const overdue = results.filter((x) => x.status === "overdue").length;
  const dueSoon = results.filter((x) => x.status === "due_soon").length;
  // Driving takes as long as it would at the usual pace.
  const drivenTo = today ? daysBefore(today, -Math.round(driven / MILES_PER_DAY)) : null;

  const history = useMemo(() => (today ? demoEvents(demoTrackCar(today)) : []), [today]);
  // Where the dashed line ends with the slider all the way over. The graph
  // keeps this frame the whole time, so it doesn't rescale while you drag.
  const frame = useMemo(() => {
    if (!today) return null;
    const end = Date.parse(`${today}T00:00:00Z`) + (MAX_DRIVE / MILES_PER_DAY + AHEAD_DAYS) * DAY;
    return { end, maxMiles: Math.round(START_MILES + MAX_DRIVE + AHEAD_DAYS * MILES_PER_DAY) };
  }, [today]);
  const timeline = useMemo(() => {
    if (!today || !drivenTo || !frame) return null;
    const built = buildMileageTimeline(
      [
        ...history,
        { key: "reading-today", kind: "reading", date: today, mileage: START_MILES, label: "Odometer updated" },
        ...done.map((d, i) => ({
          key: `done-${i}`,
          kind: "service" as const,
          date: d.date,
          mileage: d.miles,
          label: d.task,
        })),
      ],
      miles,
      drivenTo,
      reminders.map((r) => ({
        key: `due-${r.task}`,
        label: r.task,
        dueMiles: r.lastAt + r.every,
        dueOn: null,
      })),
    );
    if (!built?.projection) return built;
    // Run the projection to the frame's edge, dropping reminders past it.
    const [last, next] = built.projection;
    const rate = (next.miles - last.miles) / (next.t - last.t);
    const edge = { t: frame.end, miles: Math.round(last.miles + rate * (frame.end - last.t)) };
    return {
      ...built,
      projection: [last, edge],
      events: built.events.filter((e) => e.t <= frame.end),
      maxMiles: Math.max(built.maxMiles, edge.miles),
    };
  }, [today, drivenTo, frame, history, done, miles, reminders]);

  function markDone(task: string) {
    setReminders((rs) => rs.map((r) => (r.task === task ? { ...r, lastAt: miles } : r)));
    if (drivenTo) setDone((d) => [...d, { task, miles, date: drivenTo }]);
  }

  function reset() {
    setDriven(0);
    setReminders(START_REMINDERS);
    setDone([]);
  }

  return (
    <div className="grid rounded-lg border border-graphite bg-panel [grid-template-areas:'odo'_'drive'_'graph'_'list'_'foot'] lg:grid-cols-[26rem_minmax(0,1fr)] lg:[grid-template-areas:'odo_graph'_'drive_graph'_'list_graph'_'foot_foot']">
      <div className="border-b border-graphite p-5 [grid-area:odo] sm:p-6 lg:border-r">
        <p className="text-sm text-steel">Track toy, 2011 BMW M3</p>
        <Odometer miles={miles} />
      </div>

      <div className="border-b border-graphite p-5 [grid-area:drive] sm:p-6 lg:border-r">
        <label htmlFor="drive" className="flex items-baseline justify-between text-sm">
          <span className="field-label">Drive it</span>
          <span className="text-steel tabular-nums">+{driven.toLocaleString("en-US")} mi</span>
        </label>
        <input
          id="drive"
          type="range"
          min={0}
          max={MAX_DRIVE}
          step={10}
          value={driven}
          onChange={(e) => setDriven(Number(e.target.value))}
          className="mt-3 h-6 w-full cursor-pointer accent-redline"
        />
      </div>

      <div className="min-w-0 border-b border-graphite p-5 [grid-area:graph] sm:p-6">
        {timeline ? (
          <MileageChart timeline={timeline} frame={frame ?? undefined} />
        ) : (
          <div className="skeleton h-[18rem] w-full" aria-hidden />
        )}
      </div>

      <ul className="border-b border-graphite px-5 [grid-area:list] sm:px-6 lg:border-r lg:border-b-0">
        {results.map(({ r, status, used, text }) => (
          <li
            key={r.task}
            className="flex items-center gap-4 border-t border-rule py-4 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{r.task}</p>
                <StatusBadge status={status} />
              </div>
              <p className={`mt-0.5 text-sm tabular-nums ${textTone[status]}`}>{text}</p>
              {/* Interval used, like a tach needle heading for the redline. */}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-carbon">
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-150 motion-reduce:transition-none ${barTone[status]}`}
                  style={{ width: `${used * 100}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => markDone(r.task)}
              className="btn min-h-9 px-3 text-xs"
              aria-label={`Mark ${r.task} done at ${miles.toLocaleString("en-US")} miles`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Done
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 py-2 pr-2 pl-5 [grid-area:foot] sm:pl-6 lg:border-t lg:border-graphite">
        <p aria-live="polite" className="py-2 text-sm text-steel">
          {overdue + dueSoon === 0
          ? "Everything's on track. Keep driving."
          : `Revlog would email you now: ${[
              overdue && `${overdue} overdue`,
              dueSoon && `${dueSoon} due soon`,
            ]
              .filter(Boolean)
              .join(", ")}.`}
        </p>
        <button
          type="button"
          onClick={reset}
          className="btn shrink-0 border-transparent text-steel hover:text-chalk"
          disabled={driven === 0 && reminders === START_REMINDERS}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset
        </button>
      </div>
    </div>
  );
}

// Mechanical odometer: one drum per digit, so the numbers roll in place.
function Odometer({ miles }: { miles: number }) {
  const digits = String(miles).padStart(6, "0").split("");
  return (
    <p className="mt-2 flex items-end gap-2" aria-label={`${miles.toLocaleString("en-US")} miles`}>
      <span className="flex gap-0.5" aria-hidden>
        {digits.map((d, i) => (
          <span
            key={i}
            className="readout flex h-14 w-9 items-center justify-center rounded-sm bg-carbon text-4xl leading-none sm:h-16 sm:w-11 sm:text-5xl"
          >
            {d}
          </span>
        ))}
      </span>
      <span className="pb-1 text-sm text-steel" aria-hidden>
        mi
      </span>
    </p>
  );
}
