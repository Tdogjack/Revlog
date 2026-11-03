// Sample cars for the demo garage at /demo, so people can try Revlog without
// an account. Dates are stored as days before today and turned into real
// dates in the browser, so the history never goes stale.

import type { ModStatus } from "@/lib/mod-categories";
import { buildMileageTimeline, type TimelineEvent } from "@/lib/mileage-timeline";
import {
  dueLimits,
  evaluateReminder,
  STATUS_RANK,
  withCarAgeStart,
  withLastService,
  type ReminderResult,
} from "@/lib/reminders";

export type DemoPart = { name: string; quantity?: number; price: number };

export type DemoRecord = {
  id: string;
  servicedOn: string;
  category: string;
  title: string;
  mileage: number | null;
  cost: number | null;
  shop: string | null;
  notes: string | null;
  parts: DemoPart[];
};

export type DemoMod = {
  id: string;
  part: string;
  brand: string | null;
  category: string;
  status: ModStatus;
  installedOn: string | null;
  installedMileage: number | null;
  cost: number | null;
  notes: string | null;
  parts: DemoPart[];
};

export type DemoReminder = {
  id: string;
  vehicleId: string;
  task: string;
  serviceCategory: string | null;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneOn: string | null;
  lastDoneMileage: number | null;
  createdAt: Date;
};

// A freely licensed photo from Wikimedia Commons, credited on the page.
export type DemoPhoto = { src: string; author: string; license: string; licenseUrl: string; sourceUrl: string };

export type DemoCar = {
  id: string;
  photo: DemoPhoto;
  nickname: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  builtOn: string | null;
  currentMileage: number;
  readings: { readOn: string; mileage: number }[];
  records: DemoRecord[];
  mods: DemoMod[];
  reminders: DemoReminder[];
};

// Seed shape: `ago` is days before today.
type SeedRecord = Omit<DemoRecord, "servicedOn" | "shop" | "notes" | "parts"> & {
  ago: number;
  shop?: string;
  notes?: string;
  parts?: DemoPart[];
};
type SeedMod = Omit<DemoMod, "installedOn" | "brand" | "notes" | "parts" | "installedMileage"> & {
  ago?: number;
  brand?: string;
  installedMileage?: number;
  notes?: string;
  parts?: DemoPart[];
};
type SeedReminder = Pick<
  DemoReminder,
  "id" | "task" | "serviceCategory" | "intervalMiles" | "intervalMonths"
> & { startMileage?: number };
type SeedCar = Omit<DemoCar, "readings" | "records" | "mods" | "reminders"> & {
  readings: { ago: number; mileage: number }[];
  records: SeedRecord[];
  mods: SeedMod[];
  reminders: SeedReminder[];
};

const SEED: SeedCar[] = [
  {
    id: "m3",
    photo: {
      src: "/demo/m3.jpg",
      author: "Tokumeigakarinoaoshima",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:BMW_M3_Coup%C3%A9_(E92)_front.JPG",
    },
    nickname: "Track toy",
    year: 2011,
    make: "BMW",
    model: "M3",
    trim: "Coupe",
    vin: "WBSKG9C52BE000000",
    builtOn: "2011-04-01",
    currentMileage: 48_210,
    readings: [{ ago: 799, mileage: 35_900 }],
    records: [
      { id: "c-bf", ago: 1100, category: "brake-fluid", title: "Brake fluid flush", mileage: 31_200, cost: 139.95, shop: "Tri-County Brake & Tire", notes: "Motul RBF 600 before the first track day." },
      {
        id: "c-oil1", ago: 955, category: "oil", title: "Oil change", mileage: 33_500, cost: 132.6, shop: "Autobahn Service Co.",
        parts: [{ name: "Castrol Edge 10W-60, 7 qt", price: 78 }, { name: "Mahle oil filter OX 387D", price: 14.5 }],
      },
      { id: "c-oil2", ago: 628, category: "oil", title: "Oil change", mileage: 38_540, cost: 92.5, notes: "Did it in the garage. 10W-60 and a Mahle filter.",
        parts: [{ name: "Castrol Edge 10W-60, 7 qt", price: 78 }, { name: "Mahle oil filter OX 387D", price: 14.5 }] },
      {
        id: "c-brakes", ago: 520, category: "brakes", title: "Front pads and rotors", mileage: 39_800, cost: 968, shop: "Tri-County Brake & Tire",
        notes: "Pads were at 3 mm after two track days.",
        parts: [{ name: "Hawk DTC-60 front pads", price: 289.99 }, { name: "StopTech slotted front rotors", quantity: 2, price: 214 }],
      },
      {
        id: "c-rod", ago: 400, category: "repair", title: "Rod bearings", mileage: 42_100, cost: 2_450, shop: "Autobahn Service Co.",
        notes: "Preventive for the S65. Old bearings showed early copper.",
        parts: [{ name: "BE Bearings rod bearing kit", price: 795 }, { name: "ARP rod bolts", price: 325 }],
      },
      { id: "c-oil3", ago: 298, category: "oil", title: "Oil change", mileage: 43_620, cost: 129.4, shop: "Autobahn Service Co." },
      {
        id: "c-tires", ago: 203, category: "tires", title: "Michelin Pilot Sport 4S", mileage: 45_100, cost: 1_640, shop: "Tri-County Brake & Tire",
        notes: "Staggered set, 255/40 front and 275/40 rear.",
      },
      { id: "c-diff", ago: 628, category: "fluids", title: "Diff fluid", mileage: 38_540, cost: 74.9, notes: "BMW 75W-140 synthetic." },
      { id: "c-air", ago: 203, category: "air-filter", title: "Engine air filter", mileage: 45_100, cost: 64.9, notes: "Cleaned and re-oiled the intake filters." },
      { id: "c-align", ago: 130, category: "alignment", title: "Alignment after coilovers", mileage: 46_780, cost: 189.99, shop: "Tri-County Brake & Tire", notes: "-2.5 camber front, -1.8 rear." },
    ],
    mods: [
      {
        id: "c-intake", part: "Carbon intake", brand: "Eventuri", category: "engine", status: "installed", ago: 455, installedMileage: 41_200, cost: 2_395,
        notes: "Sounds incredible past 6,000 rpm. About two hours with basic tools.",
        parts: [{ name: "Eventuri EVE-E9X-CF-INT", price: 2_295 }, { name: "Silicone couplers", price: 100 }],
      },
      { id: "c-coils", part: "V3 coilovers", brand: "KW", category: "suspension", status: "installed", ago: 137, installedMileage: 46_600, cost: 2_680 },
      { id: "c-tune", part: "Stage 1 tune", brand: "Active Autowerke", category: "tuning", status: "installed", ago: 120, installedMileage: 46_900, cost: 899, notes: "Raised the limiter and smoothed the throttle." },
      { id: "c-exhaust", part: "Evolution exhaust", brand: "Akrapovic", category: "exhaust", status: "planned", cost: 5_900, parts: [{ name: "Akrapovic S-BM/T/2H", price: 5_900 }] },
      { id: "c-wheels", part: "ARC-8 18x9.5 wheels", brand: "Apex", category: "wheels", status: "planned", cost: 1_980, parts: [{ name: "Apex ARC-8 18x9.5 ET22, anthracite", quantity: 4, price: 495 }] },
    ],
    reminders: [
      { id: "c-r-oil", task: "Oil change", serviceCategory: "oil", intervalMiles: 5_000, intervalMonths: 12 },
      { id: "c-r-bf", task: "Brake fluid", serviceCategory: "brake-fluid", intervalMiles: null, intervalMonths: 36 },
      { id: "c-r-diff", task: "Diff fluid", serviceCategory: "fluids", intervalMiles: 15_000, intervalMonths: null },
      { id: "c-r-air", task: "Engine air filter", serviceCategory: "air-filter", intervalMiles: 15_000, intervalMonths: 12 },
      { id: "c-r-plugs", task: "Spark plugs", serviceCategory: "spark-plugs", intervalMiles: 60_000, intervalMonths: null, startMileage: 0 },
    ],
  },
  {
    id: "rav4",
    photo: {
      src: "/demo/rav4.jpg",
      author: "MercurySable99",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2021_Toyota_RAV4_XLE_AWD,_front_right,_05-24-2026.jpg",
    },
    nickname: "Daily",
    year: 2021,
    make: "Toyota",
    model: "RAV4",
    trim: "XLE",
    vin: "2T3P1RFV1MC000000",
    builtOn: "2021-02-01",
    currentMileage: 31_480,
    readings: [{ ago: 1010, mileage: 4_200 }],
    records: [
      { id: "r-oil1", ago: 830, category: "oil", title: "Oil change", mileage: 10_040, cost: null, shop: "Lakeside Toyota", notes: "Covered by ToyotaCare." },
      { id: "r-rot1", ago: 830, category: "rotation", title: "Tire rotation", mileage: 10_040, cost: null, shop: "Lakeside Toyota" },
      { id: "r-oil2", ago: 520, category: "oil", title: "Oil change", mileage: 19_960, cost: 89.95, shop: "Lakeside Toyota" },
      { id: "r-cabin", ago: 356, category: "cabin-filter", title: "Cabin air filter", mileage: 25_100, cost: 32, notes: "Five-minute job behind the glovebox." },
      {
        id: "r-oil3", ago: 205, category: "oil", title: "Oil change and rotation", mileage: 29_820, cost: 92.4, shop: "Lakeside Toyota",
        parts: [{ name: "Toyota 0W-16 synthetic, 5 qt", price: 42.75 }, { name: "Toyota oil filter 04152-YZZA1", price: 9.8 }],
      },
      { id: "r-rot2", ago: 205, category: "rotation", title: "Tire rotation", mileage: 29_820, cost: null, shop: "Lakeside Toyota" },
      { id: "r-wipers", ago: 60, category: "wipers", title: "Wiper blades", mileage: null, cost: 41.98, parts: [{ name: "Bosch Icon 26A and 17A", price: 41.98 }] },
    ],
    mods: [
      { id: "r-liners", part: "FloorLiners, front and rear", brand: "WeatherTech", category: "interior", status: "installed", ago: 980, installedMileage: 5_100, cost: 199.95 },
      { id: "r-hitch", part: "Class III hitch", brand: "Curt", category: "exterior", status: "installed", ago: 400, installedMileage: 23_300, cost: 238.5 },
      { id: "r-rack", part: "Roof rack crossbars", brand: "Thule", category: "exterior", status: "planned", cost: 289 },
    ],
    reminders: [
      { id: "r-r-oil", task: "Oil change", serviceCategory: "oil", intervalMiles: 10_000, intervalMonths: 12 },
      { id: "r-r-rot", task: "Tire rotation", serviceCategory: "rotation", intervalMiles: 5_000, intervalMonths: null },
      { id: "r-r-cabin", task: "Cabin air filter", serviceCategory: "cabin-filter", intervalMiles: null, intervalMonths: 12 },
    ],
  },
  {
    id: "miata",
    photo: {
      src: "/demo/miata.jpg",
      author: "Elise240SX",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:1994_Mazda_MX-5_Miata,_Front_Left,_09-12-2021.jpg",
    },
    nickname: "Project",
    year: 1994,
    make: "Mazda",
    model: "MX-5 Miata",
    trim: null,
    vin: null,
    builtOn: null,
    currentMileage: 142_860,
    readings: [{ ago: 700, mileage: 137_300 }],
    records: [
      {
        id: "m-belt", ago: 610, category: "repair", title: "Timing belt and water pump", mileage: 137_900, cost: 685, shop: "Pacific Coast Imports",
        notes: "Did the cam and crank seals while it was apart.",
        parts: [{ name: "Gates TCKWP179 belt and pump kit", price: 189.99 }],
      },
      { id: "m-coolant", ago: 610, category: "coolant", title: "Coolant", mileage: 137_900, cost: null, shop: "Pacific Coast Imports" },
      { id: "m-plugs", ago: 610, category: "spark-plugs", title: "Spark plugs and wires", mileage: 137_900, cost: 84.6, shop: "Pacific Coast Imports" },
      { id: "m-oil1", ago: 420, category: "oil", title: "Oil change", mileage: 139_400, cost: 48.1 },
      { id: "m-oil2", ago: 90, category: "oil", title: "Oil change", mileage: 142_100, cost: 52.3, notes: "Valvoline VR1 10W-30." },
    ],
    mods: [
      { id: "m-shocks", part: "B6 shocks", brand: "Bilstein", category: "suspension", status: "installed", ago: 400, installedMileage: 139_550, cost: 560 },
      { id: "m-exhaust", part: "Roadster exhaust", brand: "Racing Beat", category: "exhaust", status: "installed", ago: 380, installedMileage: 139_700, cost: 449 },
      { id: "m-wheel", part: "Steering wheel and hub", brand: "Momo", category: "interior", status: "removed", ago: 300, installedMileage: 140_400, cost: 310, notes: "Went back to the stock wheel for the airbag." },
      { id: "m-hardtop", part: "Hardtop", category: "exterior", status: "planned", cost: 1_200, notes: "Watching the classifieds." },
    ],
    reminders: [
      { id: "m-r-oil", task: "Oil change", serviceCategory: "oil", intervalMiles: 3_000, intervalMonths: 6 },
      { id: "m-r-belt", task: "Timing belt", serviceCategory: "repair", intervalMiles: 60_000, intervalMonths: null },
      { id: "m-r-coolant", task: "Coolant", serviceCategory: "coolant", intervalMiles: null, intervalMonths: 24 },
      { id: "m-r-plugs", task: "Spark plugs", serviceCategory: "spark-plugs", intervalMiles: 30_000, intervalMonths: null },
    ],
  },
];

const DAY = 86_400_000;
export const daysBefore = (today: string, days: number) =>
  new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY).toISOString().slice(0, 10);

// The seed with real dates, counted back from `today` (YYYY-MM-DD).
export function demoCars(today: string): DemoCar[] {
  const at = (ago: number) => daysBefore(today, ago);
  return SEED.map((car) => ({
    ...car,
    readings: car.readings.map((r) => ({ readOn: at(r.ago), mileage: r.mileage })),
    records: car.records
      .map(({ ago, ...r }) => ({
        ...r,
        servicedOn: at(ago),
        shop: r.shop ?? null,
        notes: r.notes ?? null,
        parts: r.parts ?? [],
      }))
      .sort((a, b) => b.servicedOn.localeCompare(a.servicedOn)),
    mods: car.mods.map(({ ago, ...m }) => ({
      ...m,
      brand: m.brand ?? null,
      installedOn: ago != null ? at(ago) : null,
      installedMileage: m.installedMileage ?? null,
      notes: m.notes ?? null,
      parts: m.parts ?? [],
    })),
    reminders: car.reminders.map(({ startMileage, ...r }) => ({
      ...r,
      vehicleId: car.id,
      lastDoneOn: null,
      lastDoneMileage: startMileage ?? null,
      createdAt: new Date(`${at(30)}T00:00:00Z`),
    })),
  }));
}

export type EvaluatedReminder = { reminder: DemoReminder; result: ReminderResult };

// Each reminder counted from its latest matching record, most urgent first,
// the same way the real car page does it.
export function evaluateDemoReminders(car: DemoCar): EvaluatedReminder[] {
  const services = car.records.map((r) => ({
    vehicleId: car.id,
    category: r.category,
    servicedOn: r.servicedOn,
    mileage: r.mileage,
  }));
  return car.reminders
    .map((r) => withCarAgeStart(withLastService(r, services), car))
    .map((reminder) => ({ reminder, result: evaluateReminder(reminder, car.currentMileage) }))
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status]);
}

export const modName = (m: { brand: string | null; part: string }) =>
  m.brand ? `${m.brand} ${m.part}` : m.part;

// The M3, which the landing page's odometer demo drives.
export const demoTrackCar = (today: string) => demoCars(today)[0];

// Readings, services, and installed mods as points for the mileage graph.
export function demoEvents(car: DemoCar): TimelineEvent[] {
  return [
    ...car.readings.map((r) => ({
      key: `reading-${r.readOn}`,
      kind: "reading" as const,
      date: r.readOn,
      mileage: r.mileage,
      label: "Odometer updated",
    })),
    ...car.records.map((r) => ({
      key: `service-${r.id}`,
      kind: "service" as const,
      date: r.servicedOn,
      mileage: r.mileage,
      label: r.title,
    })),
    ...car.mods.flatMap((m) =>
      m.status !== "planned" && m.installedOn
        ? [
            {
              key: `mod-${m.id}`,
              kind: "mod" as const,
              date: m.installedOn,
              mileage: m.installedMileage,
              label: modName(m),
            },
          ]
        : [],
    ),
  ];
}

export function demoTimeline(car: DemoCar, today: string, reminders?: EvaluatedReminder[]) {
  return buildMileageTimeline(
    demoEvents(car),
    car.currentMileage,
    today,
    (reminders ?? []).map(({ reminder: r }) => ({
      key: `due-${r.id}`,
      label: r.task,
      ...dueLimits(r),
    })),
  );
}

// Same as vehicleName in vehicles.ts, which is server only.
export const demoCarName = (v: { year: number; make: string; model: string; trim: string | null }) =>
  [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");

// What the landing page's demo cards show, without working out any dates.
export function demoCarCards() {
  return SEED.map((car) => ({
    id: car.id,
    nickname: car.nickname,
    name: demoCarName(car),
    currentMileage: car.currentMileage,
    photo: car.photo,
    services: car.records.length,
    installed: car.mods.filter((m) => m.status === "installed").length,
  }));
}
