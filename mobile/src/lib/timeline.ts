import type { TimelinePoint } from "@revlog/api";

// From the website's src/lib/mileage-timeline.ts. Keep the two in step.

export const DAY = 86_400_000;

// Odometer reading on the line at time t, straight between neighbors.
export function milesAt(line: TimelinePoint[], t: number) {
  const next = line.findIndex((p) => p.t >= t);
  if (next === -1) return line[line.length - 1].miles;
  if (next === 0) return line[0].miles;
  const a = line[next - 1];
  const b = line[next];
  return Math.round(a.miles + ((b.miles - a.miles) * (t - a.t)) / (b.t - a.t));
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
// otherwise every few months so there are about four labels on a phone.
export function timeTicks(start: number, end: number) {
  const months = (end - start) / (DAY * 30.44);
  const step = months > 30 ? 12 : Math.max(1, Math.ceil(months / 4));
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
