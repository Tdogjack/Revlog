"use client";

import { useEffect, useState } from "react";
import { Heart, Lock, MessageSquare, Share2 } from "lucide-react";
import { MileageChart } from "@/components/mileage-chart";
import { StatusBadge } from "@/components/status-badge";
import { demoTimeline, demoTrackCar, evaluateDemoReminders } from "@/lib/demo-garage";
import { useToday } from "@/lib/use-today";

// Small, static slices of the app for the landing page's feature explorer.
// Each fills the same fixed-height frame so switching never shifts the page.

const panel = "h-full rounded-lg border border-graphite bg-panel p-5";
const paper = "rounded-sm bg-chalk text-carbon";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-steel">{label}</p>
      <p className="field mt-1 truncate text-sm">{value}</p>
    </div>
  );
}

const useReducedMotion = () => {
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
};

// A shop receipt beside the service form it filled in, with a one-time scan pass.
export function ScanPreview() {
  const parts = [
    ["Castrol Edge 10W-60, 7 qt", "$78.00"],
    ["Mahle oil filter OX 387D", "$14.50"],
  ];
  const lines = [...parts, ["Labor", "$36.90"]];
  return (
    <div className={`${panel} grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]`}>
      <div className={`${paper} relative overflow-hidden px-4 py-4 font-mono text-xs leading-relaxed`}>
        <p className="text-center font-semibold">AUTOBAHN SERVICE CO.</p>
        <div className="my-2 border-t border-dashed border-carbon/40" />
        <p>04/26/2026</p>
        <p>Odometer 43620</p>
        <div className="my-2 border-t border-dashed border-carbon/40" />
        {lines.map(([item, price]) => (
          <p key={item} className="flex justify-between gap-2">
            <span className="truncate">{item}</span>
            <span>{price.slice(1)}</span>
          </p>
        ))}
        <div className="my-2 border-t border-dashed border-carbon/40" />
        <p className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span>129.40</span>
        </p>
        <span className="scan-sweep pointer-events-none absolute opacity-0 inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent to-redline/35" />
      </div>
      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service" value="Oil change" />
          <Field label="Date" value="Apr 26, 2026" />
          <Field label="Mileage" value="43,620 mi" />
          <Field label="Cost" value="$129.40" />
        </div>
        <p className="mt-3 text-xs text-steel">Parts</p>
        {parts.map(([item, price]) => (
          <p key={item} className="mt-1 flex justify-between gap-2 border-b border-rule pb-1 text-sm">
            <span className="truncate">{item}</span>
            <span className="text-steel tabular-nums">{price}</span>
          </p>
        ))}
        <p className="mt-3 text-sm text-done">Filled in from the photo. Check each field before saving.</p>
      </div>
    </div>
  );
}

export function EmailPreview() {
  return (
    <div className={panel}>
      <div className="border-b border-rule pb-3 text-sm">
        <p className="text-steel">
          From <span className="text-chalk">Revlog</span>
        </p>
        <p className="mt-1 font-medium">Track toy: oil change due in 410 mi</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-steel">
        Two things on your 2011 BMW M3 need attention. Here&apos;s where they stand at 48,210 mi.
      </p>
      <ul className="mt-3 rounded-md border border-graphite">
        {[
          ["Brake fluid", "Overdue by 5 days", "overdue"],
          ["Oil change", "Due in 410 mi", "due_soon"],
        ].map(([task, text, status]) => (
          <li key={task} className="flex items-center justify-between gap-3 border-t border-rule px-3 py-3 first:border-t-0">
            <div>
              <p className="font-medium">{task}</p>
              <p className="text-sm text-steel">{text}</p>
            </div>
            <StatusBadge status={status as "overdue" | "due_soon"} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-steel">
        One email before it&apos;s due, then a weekly nudge until it&apos;s logged.
      </p>
    </div>
  );
}

export function GraphPreview() {
  const today = useToday();
  const car = today ? demoTrackCar(today) : null;
  const timeline = car && today ? demoTimeline(car, today, evaluateDemoReminders(car)) : null;
  return (
    <div className={`${panel} flex min-h-[20rem] flex-col`}>
      <p className="text-sm text-steel">Track toy, every entry on one line</p>
      <div className="mt-3 min-h-0 flex-1">
        {timeline ? <MileageChart timeline={timeline} compact /> : <div className="skeleton h-full" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-steel">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-service" /> Service
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-mods" /> Mods
        </span>
      </div>
    </div>
  );
}

export function PdfPreview() {
  const rows = [
    ["Apr 26, 2026", "Oil change", "43,620", "$129.40"],
    ["Oct 2, 2025", "Rod bearings", "42,100", "$2,450.00"],
    ["Jun 1, 2025", "Front pads and rotors", "39,800", "$968.00"],
    ["Jan 22, 2025", "Oil change", "38,540", "$92.50"],
  ];
  return (
    <div className={`${panel} flex items-center justify-center bg-carbon`}>
      <div className={`${paper} w-full max-w-md px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]`}>
        <p className="font-display text-2xl leading-tight font-semibold">Service history</p>
        <p className="mt-1 text-sm text-carbon/70">2011 BMW M3 Coupe, VIN WBSKG9C52BE000000</p>
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-carbon/60">
            <tr>
              <th className="pb-1 font-normal">Date</th>
              <th className="pb-1 font-normal">Service</th>
              <th className="pb-1 text-right font-normal">Miles</th>
              <th className="pb-1 text-right font-normal">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([d, s, m, c]) => (
              <tr key={d} className="border-t border-carbon/15">
                <td className="py-1.5 pr-2 whitespace-nowrap">{d}</td>
                <td className="py-1.5 pr-2">{s}</td>
                <td className="py-1.5 text-right tabular-nums">{m}</td>
                <td className="py-1.5 text-right tabular-nums">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-carbon/60">9 records, $4,712.69 total</p>
      </div>
    </div>
  );
}

export function ModsPreview() {
  const mods = [
    ["Eventuri carbon intake", "Engine and intake", "$2,395", "installed"],
    ["KW V3 coilovers", "Suspension", "$2,680", "installed"],
    ["Active Autowerke stage 1 tune", "Tuning", "$899", "installed"],
    ["Akrapovic Evolution exhaust", "Exhaust", "$5,900", "planned"],
  ];
  return (
    <div className={panel}>
      <p className="font-display text-2xl leading-tight font-semibold">Build</p>
      <p className="mt-1 text-sm text-steel">3 installed, $5,974 invested, $7,880 planned</p>
      <ul className="mt-3">
        {mods.map(([name, cat, cost, status]) => (
          <li key={name} className="flex items-center justify-between gap-3 border-t border-rule py-3 first:border-t-0">
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-sm text-steel">
                {cat} · {cost}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${status === "installed" ? "border-done/30 text-done" : "border-graphite text-chalk"}`}
            >
              {status === "installed" ? "Installed" : "Planned"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderScanPreview() {
  return (
    <div className={`${panel} grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]`}>
      <div className={`${paper} px-4 py-4 text-xs leading-relaxed`}>
        <p className="font-semibold">Your order is confirmed</p>
        <p className="text-carbon/70">Order #EV-20931</p>
        <div className="my-2 border-t border-carbon/15" />
        <p className="font-medium">Eventuri carbon intake, E9X M3</p>
        <p className="text-carbon/70">EVE-E9X-CF-INT · Qty 1</p>
        <p className="mt-1 flex justify-between">
          <span>Item</span>
          <span>$2,295.00</span>
        </p>
        <p className="flex justify-between">
          <span>Couplers</span>
          <span>$100.00</span>
        </p>
        <div className="my-2 border-t border-carbon/15" />
        <p className="flex justify-between font-semibold">
          <span>Total</span>
          <span>$2,395.00</span>
        </p>
      </div>
      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand" value="Eventuri" />
          <Field label="Mod" value="Carbon intake" />
          <Field label="Category" value="Engine and intake" />
          <Field label="Cost" value="$2,395.00" />
        </div>
        <p className="mt-3 text-xs text-steel">Parts</p>
        <p className="mt-1 flex justify-between gap-2 border-b border-rule pb-1 text-sm">
          <span className="truncate">EVE-E9X-CF-INT</span>
          <span className="text-steel tabular-nums">$2,295.00</span>
        </p>
        <p className="mt-3 text-sm text-done">Filled in from the screenshot. Check each field before saving.</p>
      </div>
    </div>
  );
}

export function PricePreview() {
  const prices = [6250, 6250, 6180, 6180, 6090, 6120, 5990, 5990, 5900];
  const lo = 5800;
  const hi = 6300;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * 300},${((hi - p) / (hi - lo)) * 110 + 5}`)
    .join(" ");
  return (
    <div className={panel}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">Akrapovic S-BM/T/2H</p>
          <p className="text-sm text-steel">Evolution exhaust, planned</p>
        </div>
        <p className="readout shrink-0 text-3xl leading-none">$5,900</p>
      </div>
      <svg viewBox="0 0 300 120" className="mt-5 h-36 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <line x1="0" x2="300" y1="5" y2="5" className="stroke-rule" />
        <line x1="0" x2="300" y1="115" y2="115" className="stroke-rule" />
        <polyline points={pts} fill="none" className="stroke-chart-mods" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 flex justify-between text-xs text-steel">
        <span>8 weeks ago</span>
        <span>Today</span>
      </div>
      <p className="mt-4 text-sm text-done">Down $350 since you added it. Checked this morning.</p>
    </div>
  );
}

// Types a VIN, then fills the car's details, each time it's shown.
export function VinPreview() {
  const VIN = "WBSKG9C52BE000000";
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(reduced ? VIN.length : 0);
  useEffect(() => {
    if (typed >= VIN.length) return;
    const id = setTimeout(() => setTyped((n) => n + 1), 45);
    return () => clearTimeout(id);
  }, [typed]);
  const done = typed >= VIN.length;
  return (
    <div className={panel}>
      <p className="field-label">VIN</p>
      <p className="field readout mt-1 text-xl tracking-wider">
        {VIN.slice(0, typed)}
        {!done && <span className="ml-px inline-block h-5 w-px translate-y-0.5 bg-chalk" />}
      </p>
      <div className={`mt-4 grid grid-cols-2 gap-3 transition-opacity duration-200 ${done ? "opacity-100" : "opacity-30"}`}>
        <Field label="Year" value={done ? "2011" : ""} />
        <Field label="Make" value={done ? "BMW" : ""} />
        <Field label="Model" value={done ? "M3" : ""} />
        <Field label="Trim" value={done ? "Coupe" : ""} />
      </div>
      <p className={`mt-4 text-sm ${done ? "text-done" : "text-steel"}`}>
        {done ? "Filled in from the VIN." : "Looking it up…"}
      </p>
    </div>
  );
}

function MiataPost({ children }: { children?: React.ReactNode }) {
  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-steel">
        <span className="font-medium text-chalk">@nb_nate</span>
        <span>1994 Mazda MX-5 Miata</span>
        <span className="ml-auto text-xs">New mod</span>
      </div>
      <p className="mt-2 font-display text-2xl leading-tight font-semibold">
        Just installed: Racing Beat roadster exhaust
      </p>
      {children}
    </div>
  );
}

export function PostPreview() {
  return (
    <MiataPost>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/demo/miata.jpg" alt="" className="mt-3 aspect-[16/9] w-full rounded-md object-cover" />
      <div className="mt-3 flex justify-between text-sm">
        <span className="underline decoration-graphite underline-offset-2">Racing Beat 11221</span>
        <span className="text-steel tabular-nums">$449.00</span>
      </div>
    </MiataPost>
  );
}

export function CommentsPreview() {
  return (
    <MiataPost>
      <div className="mt-3 flex gap-4 text-sm text-steel">
        <span className="flex items-center gap-1.5 text-redline">
          <Heart className="h-4 w-4 fill-redline" aria-hidden /> 24
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" aria-hidden /> 2
        </span>
      </div>
      <ul className="mt-3 space-y-3 border-t border-rule pt-3">
        {[
          ["@miata_mel", "How bad is the drone on the highway?"],
          ["@nb_nate", "Quiet at 70, loud past 5k. Worth it."],
        ].map(([who, text]) => (
          <li key={text} className="text-sm">
            <span className="font-medium">{who}</span> <span className="text-steel">{text}</span>
          </li>
        ))}
      </ul>
    </MiataPost>
  );
}

export function PrivatePreview() {
  return (
    <div className={`${panel} flex flex-col justify-between`}>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/m3.jpg" alt="" className="aspect-[4/3] w-32 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight font-semibold">Track toy</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-steel">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Only you can see this
          </p>
        </div>
      </div>
      <ul className="mt-4">
        {[
          ["Service history", "Private"],
          ["Receipts and photos", "Private"],
          ["Build", "Private until you post it"],
        ].map(([what, state]) => (
          <li key={what} className="flex justify-between gap-3 border-t border-rule py-2.5 text-sm">
            <span>{what}</span>
            <span className="text-steel">{state}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-2 text-sm text-steel">
        <Share2 className="h-4 w-4" aria-hidden /> Post a build when you&apos;re ready.
      </p>
    </div>
  );
}

export function CostsPreview() {
  const months = [
    [30, 0],
    [55, 20],
    [20, 0],
    [70, 25],
    [35, 10],
    [15, 70],
    [60, 0],
    [40, 30],
  ];
  return (
    <div className={panel}>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["All time", "$11,820"],
          ["Last 12 months", "$5,630"],
          ["Mods", "$5,974"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-steel">{label}</p>
            <p className="readout mt-1 text-2xl sm:text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex h-36 items-end gap-2 border-b border-graphite">
        {months.map(([service, mods], i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]">
            {mods > 0 && <div className="rounded-t bg-chart-mods" style={{ height: `${mods}%` }} />}
            <div className={`bg-chart-service ${mods > 0 ? "" : "rounded-t"}`} style={{ height: `${service}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-steel">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-service" /> Service
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-mods" /> Mods
        </span>
      </div>
    </div>
  );
}
