// Turns odometer readings, service records, and installed mods into an
// odometer-over-time trace. The line runs through every entry with a known
// mileage; entries without one sit on the line by date. Past the last entry a
// dashed line projects the usual pace forward, with reminders placed on it.

export type TimelineEventKind = "service" | "mod" | "reading" | "due";

export type TimelineEvent = {
  key: string;
  kind: TimelineEventKind;
  date: string; // YYYY-MM-DD
  mileage: number | null;
  label: string;
  href?: string;
  // A projected reminder whose due point is already behind today.
  overdue?: boolean;
};

// A reminder's limits: due at this odometer reading, on this date, or both.
export type DueTarget = {
  key: string;
  label: string;
  href?: string;
  dueMiles: number | null;
  dueOn: string | null; // YYYY-MM-DD
};

export type TimelinePoint = { t: number; miles: number };

export type PlacedEvent = TimelineEvent & { t: number; miles: number; estimated: boolean };

export type MileageTimeline = {
  line: TimelinePoint[];
  events: PlacedEvent[];
  start: number;
  end: number;
  // From the last entry forward at the recent pace; null without enough history.
  projection: TimelinePoint[] | null;
  minMiles: number;
  maxMiles: number;
};

export const DAY = 86_400_000;
const toTime = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

// How far ahead the dashed line runs: at least this, and reminders further
// out than the max are left off.
const PROJECT_MIN_DAYS = 90;
const PROJECT_MAX_DAYS = 365;

export function buildMileageTimeline(
  events: TimelineEvent[],
  currentMileage: number,
  today = new Date().toISOString().slice(0, 10),
  due: DueTarget[] = [],
): MileageTimeline | null {
  const dated = events
    .filter((e) => !Number.isNaN(toTime(e.date)))
    .map((e) => ({ ...e, t: toTime(e.date) }))
    .sort((a, b) => a.t - b.t || (a.mileage ?? 0) - (b.mileage ?? 0));

  const line: TimelinePoint[] = dated
    .filter((e) => e.mileage != null)
    .map((e) => ({ t: e.t, miles: e.mileage! }));
  // A higher odometer than anything dated means it changed since; show it as of today.
  const last = line[line.length - 1];
  if (!last || currentMileage > last.miles) {
    line.push({ t: Math.max(toTime(today), last?.t ?? 0), miles: currentMileage });
  }
  if (line.length < 2 || line[line.length - 1].t === line[0].t) return null;

  const start = line[0].t;
  const end = line[line.length - 1].t;
  const placed = dated
    .filter((e) => e.t >= start && e.t <= end)
    .map((e) =>
      e.mileage != null
        ? { ...e, miles: e.mileage, estimated: false }
        : { ...e, miles: milesAt(line, e.t), estimated: true },
    );

  const rate = milesPerDay(line);
  let projection: TimelinePoint[] | null = null;
  if (rate) {
    const last = line[line.length - 1];
    const todayT = toTime(today);
    const horizon = last.t + PROJECT_MAX_DAYS * DAY;
    const upcoming: PlacedEvent[] = due
      .map((d) => ({ d, at: projectDue(d, last, rate) }))
      .filter(({ at }) => at && at.t <= horizon)
      .map(({ d, at }) => ({
        key: d.key,
        kind: "due" as const,
        date: toIso(at!.t),
        mileage: null,
        label: d.label,
        href: d.href,
        overdue: at!.t <= todayT,
        t: at!.t,
        miles: at!.miles,
        estimated: true,
      }))
      .sort((a, b) => a.t - b.t);
    placed.push(...upcoming);
    const endT = Math.min(
      horizon,
      Math.max(last.t + PROJECT_MIN_DAYS * DAY, todayT, ...upcoming.map((e) => e.t)),
    );
    projection = [last, { t: endT, miles: Math.round(last.miles + (rate * (endT - last.t)) / DAY) }];
  }

  const miles = [...line, ...(projection ?? [])].map((p) => p.miles);
  return {
    line,
    events: placed,
    start,
    end,
    projection,
    minMiles: Math.min(...miles),
    maxMiles: Math.max(...miles),
  };
}

// Odometer reading on the line at time t, straight between neighbors.
export function milesAt(line: TimelinePoint[], t: number) {
  const next = line.findIndex((p) => p.t >= t);
  if (next === -1) return line[line.length - 1].miles;
  if (next === 0) return line[0].miles;
  const a = line[next - 1];
  const b = line[next];
  return Math.round(a.miles + ((b.miles - a.miles) * (t - a.t)) / (b.t - a.t));
}

// Recent pace in miles a day, measured back about six months from the last
// point (or from the first, if the history is shorter). Null under two weeks
// of history or when the odometer hasn't moved.
export function milesPerDay(line: TimelinePoint[]) {
  const last = line[line.length - 1];
  const from = line.findLast((p) => p.t <= last.t - 182 * DAY) ?? line[0];
  const days = (last.t - from.t) / DAY;
  if (days < 14 || last.miles <= from.miles) return null;
  return (last.miles - from.miles) / days;
}

// Where a reminder lands on the projected line: whichever of its mileage and
// date limits comes first. One already passed sits at the last point.
export function projectDue(target: DueTarget, last: TimelinePoint, rate: number) {
  const times: number[] = [];
  if (target.dueMiles != null) times.push(last.t + ((target.dueMiles - last.miles) / rate) * DAY);
  if (target.dueOn) times.push(toTime(target.dueOn));
  if (times.length === 0) return null;
  const t = Math.max(Math.round(Math.min(...times) / DAY) * DAY, last.t);
  return { t, miles: Math.round(last.miles + (rate * (t - last.t)) / DAY) };
}

// Days until the odometer likely reads `miles`, counting from today at the
// recent pace. Zero or less means it has probably already passed.
export function daysUntilMiles(line: TimelinePoint[], rate: number, miles: number, today: number) {
  const last = line[line.length - 1];
  return (miles - last.miles) / rate - (today - last.t) / DAY;
}

// Average miles per month between two points, or null under a month apart.
export function milesPerMonth(a: TimelinePoint, b: TimelinePoint) {
  const months = (b.t - a.t) / (DAY * 30.44);
  return months >= 1 ? Math.round((b.miles - a.miles) / months) : null;
}

// Three or four round gridline values covering the mileage range.
export function mileageTicks(min: number, max: number) {
  const span = Math.max(max - min, 100);
  const raw = span / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return ticks;
}

// First-of-month dates for x-axis labels: whole years over long spans,
// otherwise every few months so there are about five labels.
export function timeTicks(start: number, end: number) {
  const months = (end - start) / (DAY * 30.44);
  const step = months > 30 ? 12 : Math.max(1, Math.ceil(months / 5));
  const from = new Date(start);
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth() + 1;
  if (step === 12) {
    y += 1;
    m = 0;
  }
  const ticks: number[] = [];
  for (;;) {
    const t = Date.UTC(y, m, 1);
    if (t > end) break;
    if (t >= start) ticks.push(t);
    m += step;
  }
  return { ticks, yearly: step === 12 };
}
