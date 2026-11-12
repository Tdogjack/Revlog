"use client";

import { useId } from "react";
import {
  CAUTION_OPTIONS,
  CONDITION_OPTIONS,
  describeInterval,
  DRIVING_OPTIONS,
  ROAD_OPTIONS,
  type DrivingAnswers,
  type ServicePlan,
} from "@/lib/service-plan";

const panelClass = "rounded-2xl border border-graphite bg-panel p-5 sm:p-6";

function ChoiceRow<V extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  columns,
}: {
  legend: string;
  name: string;
  options: readonly { value: V; label: string; hint: string }[];
  value: V;
  onChange: (next: V) => void;
  columns: string;
}) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hintId}>
      <legend className="field-label">{legend}</legend>
      <div className={`mt-1 grid gap-2 ${columns}`}>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      <p id={hintId} className="field-hint">
        {options.find((o) => o.value === value)?.hint}
      </p>
    </fieldset>
  );
}

function sentence(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")}${list.length > 2 ? "," : ""} and ${list.at(-1)}`;
}

function PlanList({ plan }: { plan: ServicePlan }) {
  return (
    <ul className="mt-3 divide-y divide-rule border-y border-rule">
      {plan.items.map((item) => {
        const planned = describeInterval(item.intervalMiles, item.intervalMonths);
        const usual = describeInterval(item.usualMiles, item.usualMonths);
        return (
          <li key={item.service} className="flex items-baseline justify-between gap-4 py-2">
            <span className="text-sm">{item.task}</span>
            <span className="text-right">
              <span className="readout block text-sm">{planned}</span>
              {planned !== usual && (
                <span className="block text-xs text-steel">Usually {usual}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// The questions and the reminders they produce, for a car in the catalog.
export function DrivingQuestions({
  answers,
  onChange,
}: {
  answers: DrivingAnswers;
  onChange: (next: DrivingAnswers) => void;
}) {
  return (
    <section aria-labelledby="driving-heading" className={`${panelClass} space-y-5`}>
      <h2 id="driving-heading" className="font-display text-xl font-semibold">
        How it&apos;s driven
      </h2>
      <ChoiceRow
        legend="How hard is it driven?"
        name="driving"
        options={DRIVING_OPTIONS}
        value={answers.driving}
        onChange={(driving) => onChange({ ...answers, driving })}
        columns="grid-cols-3"
      />
      <ChoiceRow
        legend="Where are most of its miles?"
        name="roads"
        options={ROAD_OPTIONS}
        value={answers.roads}
        onChange={(roads) => onChange({ ...answers, roads })}
        columns="grid-cols-3"
      />
      <fieldset>
        <legend className="field-label">Do any of these apply? (optional)</legend>
        <ul className="mt-1 divide-y divide-graphite rounded-md border border-graphite">
          {CONDITION_OPTIONS.map((c) => (
            <li key={c.value}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="conditions"
                  value={c.value}
                  checked={answers.conditions.includes(c.value)}
                  onChange={(e) =>
                    onChange({
                      ...answers,
                      conditions: e.target.checked
                        ? [...answers.conditions, c.value]
                        : answers.conditions.filter((v) => v !== c.value),
                    })
                  }
                  className="h-4 w-4 shrink-0 accent-redline"
                />
                {c.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <ChoiceRow
        legend="How careful do you want to be with maintenance?"
        name="caution"
        options={CAUTION_OPTIONS}
        value={answers.caution}
        onChange={(caution) => onChange({ ...answers, caution })}
        columns="grid-cols-3"
      />
    </section>
  );
}

// The reminders the car will start with. Updates as the questions are answered.
export function ServicePlanPreview({ plan }: { plan: ServicePlan }) {
  const fromMake = plan.source === "make";
  return (
    <section aria-labelledby="plan-heading" className={panelClass}>
      <h2 id="plan-heading" className="font-display text-xl font-semibold">
        Your service reminders
      </h2>
      <p aria-live="polite" className="mt-1 text-sm text-steel">
        {fromMake
          ? `Based on ${plan.makeName}'s typical schedule${
              plan.adjustedFor.length > 0 ? `, adjusted for ${sentence(plan.adjustedFor)}` : ""
            }.`
          : "We don't have a schedule for this car, so these are general intervals for most cars. Change them to match your owner's manual."}
      </p>
      <PlanList plan={plan} />
      <p className="field-hint">
        These are the basics to start with. On the car&apos;s page, log when each was last done or
        mark it never done so we can show where it stands. You can add more there too, like tire
        rotations. Your owner&apos;s manual has the final word.
      </p>
    </section>
  );
}
