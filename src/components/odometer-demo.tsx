"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { ReminderStatus } from "@/lib/reminders";

const START_MILES = 48_210;
const MAX_DRIVE = 8_000;
// Revlog's default "due soon" window when no percent is set.
const DUE_SOON_MILES = 500;

type DemoReminder = { task: string; every: number; lastAt: number };

const START_REMINDERS: DemoReminder[] = [
  { task: "Oil change", every: 5_000, lastAt: 43_620 },
  { task: "Brake fluid", every: 30_000, lastAt: 20_400 },
  { task: "Tire rotation", every: 7_500, lastAt: 45_100 },
  { task: "Spark plugs", every: 60_000, lastAt: 0 },
];

function evaluate(r: DemoReminder, miles: number) {
  const left = r.lastAt + r.every - miles;
  const status: ReminderStatus = left < 0 ? "overdue" : left <= DUE_SOON_MILES ? "due_soon" : "ok";
  const used = Math.min(1, Math.max(0, (miles - r.lastAt) / r.every));
  const text =
    left < 0
      ? `Overdue by ${(-left).toLocaleString("en-US")} mi`
      : `Due in ${left.toLocaleString("en-US")} mi`;
  return { status, used, text };
}

const barTone: Record<ReminderStatus, string> = {
  ok: "bg-steel",
  due_soon: "bg-due",
  overdue: "bg-overdue",
};
const textTone: Record<ReminderStatus, string> = {
  ok: "text-steel",
  due_soon: "text-due",
  overdue: "text-overdue",
};

// A playable slice of a car page: drive miles with the slider and watch the
// reminders count down, then mark one done to reset it from today's miles.
export function OdometerDemo() {
  const [driven, setDriven] = useState(0);
  const [reminders, setReminders] = useState(START_REMINDERS);
  const miles = START_MILES + driven;
  const results = reminders.map((r) => ({ r, ...evaluate(r, miles) }));
  const overdue = results.filter((x) => x.status === "overdue").length;
  const dueSoon = results.filter((x) => x.status === "due_soon").length;

  function markDone(task: string) {
    setReminders((rs) => rs.map((r) => (r.task === task ? { ...r, lastAt: miles } : r)));
  }

  function reset() {
    setDriven(0);
    setReminders(START_REMINDERS);
  }

  return (
    <div className="rounded-lg border border-graphite bg-panel">
      <div className="border-b border-graphite p-5 sm:p-6">
        <p className="text-sm text-steel">Track toy, 2019 Honda Civic Si</p>
        <Odometer miles={miles} />
      </div>

      <div className="border-b border-graphite p-5 sm:p-6">
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

      <ul className="px-5 sm:px-6">
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

      <div className="flex items-center justify-between gap-3 border-t border-graphite py-2 pr-2 pl-5 sm:pl-6">
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
