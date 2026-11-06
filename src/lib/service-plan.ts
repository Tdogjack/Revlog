// Turns a car and how it's driven into a list of service reminders. Pure, so
// the add-car form can preview the plan and the server can save the same one.

import {
  BASE_SCHEDULE,
  findMake,
  findModel,
  modelSchedule,
  type Interval,
  type ServiceKey,
} from "@/lib/car-catalog";
import { REMINDER_PRESETS } from "@/lib/reminder-presets";

export const DRIVING_OPTIONS = [
  { value: "gentle", label: "Gentle", hint: "Easy on the throttle and brakes." },
  { value: "normal", label: "Normal", hint: "Everyday driving." },
  { value: "hard", label: "Hard", hint: "Spirited driving, hard stops, or track days." },
] as const;

export const ROAD_OPTIONS = [
  { value: "city", label: "City", hint: "Mostly stop-and-go traffic." },
  { value: "mixed", label: "Mixed", hint: "A bit of both." },
  { value: "highway", label: "Highway", hint: "Mostly steady cruising." },
] as const;

// The conditions owner's manuals treat as severe service.
export const CONDITION_OPTIONS = [
  { value: "short-trips", label: "Mostly short trips, under 5 miles" },
  { value: "towing", label: "Towing or carrying heavy loads" },
  { value: "dusty", label: "Dirt, gravel, or dusty roads" },
  { value: "extreme-weather", label: "Very hot or very cold weather" },
  { value: "stored", label: "Sits for weeks between drives" },
] as const;

export const CAUTION_OPTIONS = [
  { value: "standard", label: "Standard", hint: "The usual schedule, adjusted for how you drive." },
  { value: "careful", label: "Careful", hint: "About 15% sooner than the usual schedule." },
  { value: "strict", label: "Very careful", hint: "About 30% sooner than the usual schedule." },
] as const;

type Driving = (typeof DRIVING_OPTIONS)[number]["value"];
type Roads = (typeof ROAD_OPTIONS)[number]["value"];
type Condition = (typeof CONDITION_OPTIONS)[number]["value"];
type Caution = (typeof CAUTION_OPTIONS)[number]["value"];

export type DrivingAnswers = {
  driving: Driving;
  roads: Roads;
  conditions: Condition[];
  caution: Caution;
};

export const DEFAULT_ANSWERS: DrivingAnswers = {
  driving: "normal",
  roads: "mixed",
  conditions: [],
  caution: "standard",
};

// Anything unrecognized falls back to the default rather than blocking the save.
export function readAnswers(formData: FormData): DrivingAnswers {
  return pickAnswers({
    driving: formData.get("driving"),
    roads: formData.get("roads"),
    conditions: formData.getAll("conditions"),
    caution: formData.get("caution"),
  });
}

// Anything unrecognized falls back to the defaults.
export function pickAnswers(raw: {
  driving?: unknown;
  roads?: unknown;
  conditions?: unknown;
  caution?: unknown;
}): DrivingAnswers {
  const pick = <T extends string>(value: unknown, options: readonly { value: T }[], fallback: T) =>
    options.find((o) => o.value === value)?.value ?? fallback;
  const picked: unknown[] = Array.isArray(raw.conditions) ? raw.conditions : [];
  return {
    driving: pick(raw.driving, DRIVING_OPTIONS, DEFAULT_ANSWERS.driving),
    roads: pick(raw.roads, ROAD_OPTIONS, DEFAULT_ANSWERS.roads),
    conditions: CONDITION_OPTIONS.map((c) => c.value).filter((c) => picked.includes(c)),
    caution: pick(raw.caution, CAUTION_OPTIONS, DEFAULT_ANSWERS.caution),
  };
}

const TASKS: Record<ServiceKey, string> = {
  oil: "Oil change",
  rotation: "Tire rotation",
  brakes: "Brake check",
  "air-filter": "Engine air filter",
  "cabin-filter": "Cabin air filter",
  "brake-fluid": "Brake fluid",
  coolant: "Coolant",
  transmission: "Transmission fluid",
  differential: "Differential fluid",
  "spark-plugs": "Spark plugs",
  battery: "Battery check",
  wipers: "Wiper blades",
  inspection: "Inspection",
};

const SERVICES = Object.keys(TASKS) as ServiceKey[];

// The reminders a new car starts with: few enough not to overwhelm a new
// owner. The rest are suggested when someone adds them to the car.
const STARTER_SERVICES: ServiceKey[] = [
  "oil",
  "air-filter",
  "spark-plugs",
  "brake-fluid",
  "inspection",
];
// Electric cars have no oil, air filter, or plugs, so tires take their place.
const STARTER_SERVICES_ELECTRIC: ServiceKey[] = ["rotation", "brake-fluid", "inspection"];

type Effect = Partial<Record<ServiceKey, number>>;
type Answer = Exclude<Driving | Roads, "normal" | "mixed"> | Condition;

// How each answer scales an interval: below 1 means sooner. Above 1 only offsets
// another answer, since the plan never goes past the usual schedule. Only the
// services an answer really wears on are listed.
const EFFECTS: Record<Answer, Effect> = {
  gentle: { oil: 1.1, brakes: 1.2, rotation: 1.1 },
  hard: {
    oil: 0.75,
    transmission: 0.75,
    differential: 0.75,
    brakes: 0.7,
    rotation: 0.85,
    "brake-fluid": 0.75,
    "spark-plugs": 0.85,
  },
  city: { oil: 0.85, transmission: 0.85, brakes: 0.8, "air-filter": 0.9 },
  highway: { oil: 1.1, transmission: 1.1, brakes: 1.25 },
  "short-trips": { oil: 0.7, battery: 0.75 },
  towing: {
    oil: 0.75,
    transmission: 0.6,
    differential: 0.6,
    brakes: 0.8,
    coolant: 0.85,
    "brake-fluid": 0.75,
  },
  dusty: { "air-filter": 0.5, "cabin-filter": 0.6, oil: 0.85 },
  "extreme-weather": { oil: 0.85, battery: 0.7, coolant: 0.85, wipers: 0.75 },
  // Moisture builds up in oil on a car that rarely gets warm.
  stored: { oil: 0.85, battery: 0.75 },
};

const SUMMARY: Record<Answer, string> = {
  gentle: "gentle driving",
  hard: "hard driving",
  city: "city miles",
  highway: "highway miles",
  "short-trips": "short trips",
  towing: "towing",
  dusty: "dusty roads",
  "extreme-weather": "extreme weather",
  stored: "time parked",
};

const CAUTION_FACTOR: Record<Caution, number> = {
  standard: 1,
  careful: 0.85,
  strict: 0.7,
};

// Set by the calendar or by visible wear, so caution doesn't stretch them.
const NOT_SCALED_BY_CAUTION: ServiceKey[] = ["battery", "wipers"];

// Stacked answers stop here. Manuals' severe schedules are about half the normal one.
const MIN_FACTOR = 0.5;
// Manufacturers' schedules are already long, so nothing ever exceeds them.
const MAX_FACTOR = 1;
const MIN_MONTHS = 3;

// Cars from before long-life oils and iridium plugs ran on shorter schedules.
const OLDER_CAR_YEAR = 2010;

function roundMiles(miles: number) {
  const step = miles < 20000 ? 500 : 1000;
  return Math.max(step, Math.round(miles / step) * step);
}

function scale([miles, months]: Interval, milesFactor: number, monthsFactor: number): Interval {
  return [
    // Unchanged numbers stay exact: rounding would turn a real 6,250 into 6,500.
    miles == null || milesFactor === 1 ? miles : Math.min(miles, roundMiles(miles * milesFactor)),
    months == null ? null : Math.max(MIN_MONTHS, Math.round(months * monthsFactor)),
  ];
}

export type PlanItem = {
  service: ServiceKey;
  task: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  // The interval before the driving answers, shown when they changed it.
  usualMiles: number | null;
  usualMonths: number | null;
};

export type ServicePlan = {
  // "make" means the numbers are typical for this make; "general" means the
  // car isn't in the catalog, so they're common intervals for any car.
  source: "make" | "general";
  makeName: string | null;
  items: PlanItem[];
  // What changed the numbers, like "hard driving" and "towing".
  adjustedFor: string[];
};

function planItem(service: ServiceKey, planned: Interval, usual: Interval): PlanItem {
  return {
    service,
    task: TASKS[service],
    intervalMiles: planned[0],
    intervalMonths: planned[1],
    usualMiles: usual[0],
    usualMonths: usual[1],
  };
}

function generalSchedule(): Partial<Record<ServiceKey, Interval>> {
  const presets = Object.fromEntries(
    REMINDER_PRESETS.map((p) => [p.type, [p.intervalMiles, p.intervalMonths] as Interval]),
  );
  return { ...presets, brakes: BASE_SCHEDULE.brakes, battery: BASE_SCHEDULE.battery };
}

function forOlderCar(service: ServiceKey, interval: Interval, year: number): Interval {
  // A blank or half-typed year isn't an old car.
  if (!Number.isInteger(year) || year < 1886 || year >= OLDER_CAR_YEAR) return interval;
  if (service === "oil") return [Math.min(interval[0] ?? 5000, 5000), 6];
  if (service === "spark-plugs") return [Math.min(interval[0] ?? 60000, 60000), null];
  return interval;
}

type CarInfo = { year: string | number; make: string; model: string };

// Every service, adjusted for the answers.
function fullPlan(car: CarInfo, answers: DrivingAnswers): ServicePlan & { picked: Answer[] } {
  const make = findMake(car.make);
  const model = make && findModel(make, car.model);

  if (!make || !model) {
    const general = generalSchedule();
    return {
      source: "general",
      makeName: null,
      adjustedFor: [],
      picked: [],
      items: SERVICES.flatMap((service) => {
        const interval = general[service];
        return interval ? [planItem(service, interval, interval)] : [];
      }),
    };
  }

  const schedule = modelSchedule(make, model);
  const picked = [answers.driving, answers.roads, ...answers.conditions].filter(
    (a): a is Answer => a in EFFECTS,
  );

  const items = SERVICES.flatMap((service) => {
    const book = schedule[service];
    if (!book) return [];
    const usual = forOlderCar(service, book, Number(car.year));
    // Inspections follow local law, whatever the driving.
    if (service === "inspection") return [planItem(service, usual, usual)];

    const driving = picked.reduce((f, a) => f * (EFFECTS[a][service] ?? 1), 1);
    const caution = NOT_SCALED_BY_CAUTION.includes(service) ? 1 : CAUTION_FACTOR[answers.caution];
    const clamp = (f: number) => Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, f));
    // Easier driving doesn't offset time limits: fluids age regardless.
    const planned = scale(usual, clamp(driving * caution), clamp(Math.min(driving, 1) * caution));
    return [planItem(service, planned, usual)];
  });

  return { source: "make", makeName: make.name, items, adjustedFor: [], picked };
}

// The starter reminders for a new car.
export function buildServicePlan(car: CarInfo, answers: DrivingAnswers): ServicePlan {
  const { picked, ...plan } = fullPlan(car, answers);
  const electric = !plan.items.some((i) => i.service === "oil");
  const starters = electric ? STARTER_SERVICES_ELECTRIC : STARTER_SERVICES;
  const items = plan.items.filter((i) => starters.includes(i.service));

  // Only name what changed a number the owner can see.
  const adjustedFor = picked
    .filter((a) => items.some((i) => (EFFECTS[a][i.service] ?? 1) < 1))
    .map((a) => SUMMARY[a]);
  if (plan.source === "make" && (answers.caution === "careful" || answers.caution === "strict")) {
    adjustedFor.push("extra caution");
  }

  return { ...plan, items, adjustedFor };
}

export type SuggestedInterval = { intervalMiles: number | null; intervalMonths: number | null };

// Typical intervals for every service on a car, for filling in the add-reminder
// form. Empty when the car isn't in the catalog.
export function suggestedIntervals(car: CarInfo): Record<string, SuggestedInterval> {
  const plan = fullPlan(car, DEFAULT_ANSWERS);
  if (plan.source !== "make") return {};
  return Object.fromEntries(
    plan.items.map(({ service, intervalMiles, intervalMonths }) => [
      service,
      { intervalMiles, intervalMonths },
    ]),
  );
}

// Like "7,500 mi or 12 mo".
export function describeInterval(miles: number | null, months: number | null) {
  return [miles != null && `${miles.toLocaleString("en-US")} mi`, months != null && `${months} mo`]
    .filter(Boolean)
    .join(" or ");
}
