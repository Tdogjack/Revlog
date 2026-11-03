"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { Pencil, X } from "lucide-react";
import {
  DAY,
  mileageTicks,
  milesAt,
  milesPerMonth,
  timeTicks,
  type MileageTimeline,
  type PlacedEvent,
  type TimelineEventKind,
  type TimelinePoint,
} from "@/lib/mileage-timeline";

const mi = (n: number) => n.toLocaleString("en-US");
const fmt = (t: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(t).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
const fullDate = (t: number) => fmt(t, { month: "short", day: "numeric", year: "numeric" });

const KINDS: { kind: TimelineEventKind; label: string; plural: string }[] = [
  { kind: "service", label: "Service", plural: "Service" },
  { kind: "mod", label: "Mod", plural: "Mods" },
  { kind: "reading", label: "Reading", plural: "Odometer" },
  { kind: "due", label: "Due", plural: "Upcoming" },
];
const kindLabel = (k: TimelineEventKind, overdue?: boolean) =>
  overdue ? "Overdue" : KINDS.find((x) => x.kind === k)!.label;

const RANGES = [
  { id: "6m", label: "6M", days: 182 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

// Entries closer than this many pixels merge into one numbered marker.
const MERGE_PX = 16;
const MARGIN = { top: 14, right: 14, bottom: 28, left: 46 };
const MARGIN_COMPACT = { top: 10, right: 10, bottom: 20, left: 34 };
// Space between the axis labels and the first and last points, so markers at
// either end don't sit on the labels.
const INSET_X = 16;
const INSET_X_COMPACT = 8;

type Cluster = { key: string; x: number; y: number; events: PlacedEvent[] };

// The odometer graph: drag across it to read the mileage on any date, tap a
// marker to list what was done there, and narrow by time or type. The compact
// version on the garage card is display only, so the whole card stays a link.
export function MileageChart({
  timeline,
  compact = false,
}: {
  timeline: MileageTimeline;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const fillId = useId();
  const [width, setWidth] = useState(0);
  const [boxH, setBoxH] = useState(0);
  const [range, setRange] = useState<RangeId>("all");
  const [shown, setShown] = useState<Record<TimelineEventKind, boolean>>({
    service: true,
    mod: true,
    reading: true,
    due: true,
  });
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hoverCluster, setHoverCluster] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      setBoxH(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tapping outside or pressing Escape closes the list.
  useEffect(() => {
    if (!selected) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setSelected(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const span = (timeline.end - timeline.start) / DAY;
  const ranges = RANGES.filter((r) => r.id === "all" || span > r.days * 1.2);
  const height = compact ? boxH : width && width < 520 ? 200 : 260;
  const M = compact ? MARGIN_COMPACT : MARGIN;
  const inset = compact ? INSET_X_COMPACT : INSET_X;
  // The garage card sticks to what's been logged.
  const projection = compact ? null : timeline.projection;

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    const start = Math.max(timeline.start, timeline.end - days * DAY);
    const end = projection ? projection[projection.length - 1].t : timeline.end;
    // Enter from the left edge when the range cuts the line.
    const line: TimelinePoint[] = [
      ...(start > timeline.start ? [{ t: start, miles: milesAt(timeline.line, start) }] : []),
      ...timeline.line.filter((p) => p.t >= start),
    ];
    const ahead = projection ?? [];
    const miles = [...line, ...ahead].map((p) => p.miles);
    const ticks = mileageTicks(Math.min(...miles), Math.max(...miles));
    // Logged line plus the projection, for reading mileage anywhere on the graph.
    const full = [...line, ...ahead.slice(1)];
    return { start, end, line, full, ticks, lo: ticks[0], hi: ticks[ticks.length - 1] };
  }, [timeline, range, projection]);

  const plotW = Math.max(width - M.left - M.right, 1);
  const plotH = height - M.top - M.bottom;
  const innerW = Math.max(plotW - inset * 2, 1);
  const sx = (t: number) =>
    M.left + inset + ((t - view.start) / (view.end - view.start)) * innerW;
  const sy = (m: number) => M.top + (1 - (m - view.lo) / (view.hi - view.lo)) * plotH;
  const tAt = (x: number) =>
    view.start + ((x - M.left - inset) / innerW) * (view.end - view.start);

  const hasDue = !compact && timeline.events.some((e) => e.kind === "due");
  const visible = timeline.events.filter(
    (e) => shown[e.kind] && e.t >= view.start && (e.kind !== "due" || hasDue),
  );

  // Greedy left-to-right merge so overlapping markers become one list.
  const clusters: Cluster[] = [];
  if (width) {
    const out = clusters;
    let anchor = { x: -Infinity, y: 0 };
    for (const e of visible) {
      const x = sx(e.t);
      const y = sy(e.miles);
      const last = out[out.length - 1];
      if (last && x - anchor.x <= MERGE_PX && Math.abs(y - anchor.y) <= MERGE_PX * 1.5) {
        last.events.push(e);
      } else {
        out.push({ key: e.key, x, y, events: [e] });
        anchor = { x, y };
      }
    }
    for (const c of out) {
      c.x = c.events.reduce((s, e) => s + sx(e.t), 0) / c.events.length;
      c.y = c.events.reduce((s, e) => s + sy(e.miles), 0) / c.events.length;
    }
  }

  const selectedCluster = clusters.find((c) => c.events.some((e) => e.key === selected));
  const hovered = clusters.find((c) => c.key === hoverCluster);

  function onMove(ev: PointerEvent<SVGRectElement>) {
    const box = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - box.left + M.left;
    const near = clusters.reduce<Cluster | null>(
      (best, c) =>
        Math.abs(c.x - x) <= 12 && (!best || Math.abs(c.x - x) < Math.abs(best.x - x)) ? c : best,
      null,
    );
    setHoverCluster(near?.key ?? null);
    setHoverT(near ? tAt(near.x) : Math.min(Math.max(tAt(x), view.start), view.end));
  }
  function onLeave() {
    setHoverT(null);
    setHoverCluster(null);
  }

  // The readout above the plot follows the pointer, else shows the latest reading.
  const first = view.line[0];
  const latest = view.line[view.line.length - 1];
  const readT = hoverT ?? latest.t;
  const readMiles = hovered
    ? Math.round(hovered.events.reduce((s, e) => s + e.miles, 0) / hovered.events.length)
    : milesAt(view.full, readT);
  const ahead = readT > latest.t;
  const monthly = milesPerMonth(first, latest);

  const path = view.line.map((p) => `${sx(p.t)},${sy(p.miles)}`).join(" ");
  const projPath = projection?.map((p) => `${sx(p.t)},${sy(p.miles)}`).join(" ");
  const { ticks: xTicks, yearly } = timeTicks(view.start, view.end);

  const summary = hovered
    ? `${clusterDate(hovered)} · ${hovered.events.length === 1 ? hovered.events[0].label : `${hovered.events.length} entries, tap to list`}`
    : hoverT != null
      ? ahead
        ? `Projected, ${fullDate(readT)}`
        : fullDate(readT)
      : null;

  const header = compact ? (
    <p className="flex min-w-0 items-baseline gap-2 text-xs text-steel">
      <span className="readout shrink-0 text-base leading-none text-chalk">{mi(readMiles)} mi</span>
      <span className="truncate">
        {summary ??
          [
            `Since ${fmt(first.t, { month: "short", year: "numeric" })}`,
            monthly != null && `${mi(monthly)}/mo`,
          ]
            .filter(Boolean)
            .join(" · ")}
      </span>
    </p>
  ) : (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div aria-live="polite" className="min-h-[3.25rem]">
        <p className="flex items-baseline gap-1.5">
          <span className="readout text-3xl leading-none text-chalk">
            {ahead ? "~" : ""}
            {mi(readMiles)}
          </span>
          <span className="text-xs text-steel">mi</span>
        </p>
        <p className="mt-1.5 text-xs text-steel">
          {summary ??
            [
              `Latest, ${fullDate(latest.t)}`,
              `+${mi(latest.miles - first.miles)} mi ${range === "all" ? "total" : "in range"}`,
              monthly != null && `${mi(monthly)}/mo`,
            ]
              .filter(Boolean)
              .join(" · ")}
        </p>
      </div>
      {ranges.length > 1 && (
        <div className="flex gap-1" role="group" aria-label="Time range">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => {
                setRange(r.id);
                setSelected(null);
              }}
              className="btn min-h-8 px-2.5 text-xs text-steel aria-pressed:border-steel aria-pressed:bg-graphite aria-pressed:text-chalk"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={root}
      className={compact ? "pointer-events-none flex h-full flex-col" : undefined}
      aria-hidden={compact || undefined}
    >
      {header}

      <div
        ref={wrap}
        className={compact ? "relative mt-2 min-h-0 flex-1" : "relative mt-4"}
        style={compact ? undefined : { height }}
      >
        {width > 0 && height > 0 && (
          <>
            <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chalk)" stopOpacity="0.09" />
                  <stop offset="100%" stopColor="var(--color-chalk)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {view.ticks.map((v) => (
                <g key={v}>
                  <line
                    x1={M.left}
                    x2={width - M.right}
                    y1={sy(v)}
                    y2={sy(v)}
                    className="stroke-rule"
                  />
                  <text
                    x={M.left - (compact ? 6 : 10)}
                    y={sy(v)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className={`readout fill-steel ${compact ? "text-[10px]" : "text-xs"}`}
                  >
                    {v >= 1000 ? `${mi(v / 1000)}k` : v}
                  </text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <text
                  key={t}
                  x={sx(t)}
                  y={height - (compact ? 4 : 8)}
                  textAnchor="middle"
                  className={`fill-steel tabular-nums ${compact ? "text-[10px]" : "text-[11px]"}`}
                >
                  {yearly
                    ? fmt(t, { year: "numeric" })
                    : i === 0 || new Date(t).getUTCMonth() === 0
                      ? fmt(t, { month: "short", year: "2-digit" }).replace(" ", " '")
                      : fmt(t, { month: "short" })}
                </text>
              ))}
              <polygon
                points={`${path} ${sx(latest.t)},${M.top + plotH} ${sx(first.t)},${M.top + plotH}`}
                fill={`url(#${fillId})`}
              />
              {projPath && (
                <polyline
                  points={projPath}
                  fill="none"
                  className="stroke-chalk/45"
                  strokeWidth={2}
                  strokeDasharray="2 5"
                  strokeLinecap="round"
                />
              )}
              <polyline
                points={path}
                fill="none"
                className="stroke-chalk/70"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {hoverT != null && (
                <>
                  <line
                    x1={sx(readT)}
                    x2={sx(readT)}
                    y1={M.top}
                    y2={M.top + plotH}
                    className="stroke-steel/60"
                    strokeDasharray="3 3"
                  />
                  {!hovered && (
                    <circle
                      cx={sx(readT)}
                      cy={sy(readMiles)}
                      r={4}
                      className={ahead ? "fill-panel stroke-chalk/70" : "fill-chalk stroke-panel"}
                      strokeWidth={2}
                    />
                  )}
                </>
              )}
              {!compact && (
                <rect
                  x={M.left}
                  y={M.top}
                  width={plotW}
                  height={plotH}
                  fill="transparent"
                  className="touch-pan-y"
                  onPointerMove={onMove}
                  onPointerDown={onMove}
                  onPointerLeave={onLeave}
                  onClick={() => hovered && setSelected(hovered.events[0].key)}
                />
              )}
            </svg>
            {clusters.map((c) =>
              compact ? (
                <span
                  key={c.key}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2"
                  style={{ left: c.x, top: c.y }}
                >
                  <MarkerFace cluster={c} active={false} />
                </span>
              ) : (
                <ClusterMarker
                  key={c.key}
                  cluster={c}
                  active={selectedCluster?.key === c.key || hovered?.key === c.key}
                  onSelect={() =>
                    setSelected(selectedCluster?.key === c.key ? null : c.events[0].key)
                  }
                  onHover={(on) => {
                    setHoverCluster(on ? c.key : null);
                    setHoverT(on ? tAt(c.x) : null);
                  }}
                />
              ),
            )}
          </>
        )}
      </div>

      {!compact && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1" role="group" aria-label="Show on graph">
            {KINDS.filter((k) => k.kind !== "due" || hasDue).map(({ kind, plural }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={shown[kind]}
                onClick={() => {
                  setShown((s) => ({ ...s, [kind]: !s[kind] }));
                  setSelected(null);
                }}
                className="btn min-h-8 border-transparent px-2.5 text-xs text-steel hover:text-chalk aria-pressed:text-chalk [&:not([aria-pressed=true])>svg]:opacity-30"
              >
                <Shape kind={kind} size={sizeOf(kind)} />
                {plural}
              </button>
            ))}
            {projection && (
              <span className="flex min-h-8 items-center gap-2 px-2.5 text-xs text-steel">
                <svg width="16" height="2" aria-hidden className="shrink-0 overflow-visible">
                  <line
                    x1="1"
                    x2="15"
                    y1="1"
                    y2="1"
                    className="stroke-chalk/60"
                    strokeWidth="2"
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                  />
                </svg>
                Projected at your recent pace
              </span>
            )}
          </div>

          {selectedCluster && (
            <ClusterList
              cluster={selectedCluster}
              onClose={() => setSelected(null)}
            />
          )}

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-xs text-steel hover:text-chalk">
              Show as a table
            </summary>
            <table className="mt-2 w-full text-left text-xs">
              <thead className="text-steel">
                <tr>
                  <th className="py-1 font-normal">Date</th>
                  <th className="py-1 font-normal">Entry</th>
                  <th className="py-1 text-right font-normal">Mileage</th>
                </tr>
              </thead>
              <tbody>
                {[...visible].reverse().map((e) => (
                  <tr key={e.key} className="border-t border-graphite">
                    <td className="py-1 pr-3 whitespace-nowrap">{fullDate(e.t)}</td>
                    <td className="py-1">
                      {e.label} <span className="text-steel">({kindLabel(e.kind, e.overdue)})</span>
                    </td>
                    <td className="readout py-1 text-right whitespace-nowrap">
                      {e.estimated ? "~" : ""}
                      {mi(e.miles)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}

const sizeOf = (k: TimelineEventKind) => (k === "mod" || k === "due" ? 12 : 10);

function clusterDate(c: Cluster) {
  const a = c.events[0].t;
  const b = c.events[c.events.length - 1].t;
  if (a === b) return fullDate(a);
  const sameYear = new Date(a).getUTCFullYear() === new Date(b).getUTCFullYear();
  return `${fmt(a, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" })} to ${fullDate(b)}`;
}

function Shape({
  kind,
  size,
  overdue = false,
}: {
  kind: TimelineEventKind;
  size: number;
  overdue?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className="shrink-0 overflow-visible">
      {kind === "due" ? (
        <rect
          x="2"
          y="2"
          width="8"
          height="8"
          rx="1"
          transform="rotate(45 6 6)"
          className={`${overdue ? "fill-overdue" : "fill-due"} stroke-panel`}
          strokeWidth="2"
          paintOrder="stroke"
        />
      ) : kind === "service" ? (
        <rect x="1" y="1" width="10" height="10" rx="2" className="fill-chart-service stroke-panel" strokeWidth="2" paintOrder="stroke" />
      ) : kind === "mod" ? (
        <circle cx="6" cy="6" r="5.5" className="fill-chart-mods stroke-panel" strokeWidth="2" paintOrder="stroke" />
      ) : (
        <circle cx="6" cy="6" r="4" className="fill-panel stroke-chalk" strokeWidth="2" />
      )}
    </svg>
  );
}

function ClusterMarker({
  cluster,
  active,
  onSelect,
  onHover,
}: {
  cluster: Cluster;
  active: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  const { events } = cluster;
  const label =
    events.length === 1
      ? `${kindLabel(events[0].kind, events[0].overdue)}: ${events[0].label}, ${fullDate(events[0].t)}, ${events[0].estimated ? "about " : ""}${mi(events[0].miles)} mi`
      : `${events.length} entries, ${clusterDate(cluster)}. Show list`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={events.length > 1 ? active : undefined}
      onClick={onSelect}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md"
      style={{ left: cluster.x, top: cluster.y }}
    >
      <MarkerFace cluster={cluster} active={active} />
    </button>
  );
}

// A lone entry's shape, or a count box for a group: bordered in the series
// color when every entry is the same type, white when mixed.
function MarkerFace({ cluster, active }: { cluster: Cluster; active: boolean }) {
  const { events } = cluster;
  if (events.length === 1) {
    return (
      <span className={`flex rounded transition-transform ${active ? "scale-150" : ""}`}>
        <Shape kind={events[0].kind} size={sizeOf(events[0].kind)} overdue={events[0].overdue} />
      </span>
    );
  }
  const kinds = new Set(events.map((e) => e.kind));
  const only = kinds.size === 1 ? events[0].kind : null;
  const border =
    only === "service"
      ? "border-chart-service"
      : only === "mod"
        ? "border-chart-mods"
        : only === "due"
          ? "border-due"
          : "border-chalk/70";
  return (
    <span
      className={`readout flex h-5 min-w-5 items-center justify-center rounded border-2 bg-carbon px-1 text-xs leading-none text-chalk ${border} ${active ? "bg-graphite" : ""}`}
    >
      {events.length}
    </span>
  );
}

// Everything logged at one spot on the graph, with links to edit each entry.
function ClusterList({ cluster, onClose }: { cluster: Cluster; onClose: () => void }) {
  const { events } = cluster;
  const lo = Math.min(...events.map((e) => e.miles));
  const hi = Math.max(...events.map((e) => e.miles));
  return (
    <div className="mt-3 rounded-md border border-graphite bg-carbon/60 p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{clusterDate(cluster)}</p>
          <p className="readout mt-0.5 text-sm text-steel">
            {lo === hi ? `${mi(lo)} mi` : `${mi(lo)} to ${mi(hi)} mi`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close list" title="Close" className="icon-btn -mt-1.5 -mr-2">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="mt-2">
        {events.map((e) => (
          <li key={e.key} className="flex items-center gap-3 border-t border-rule py-2 first:border-t-0">
            <Shape kind={e.kind} size={sizeOf(e.kind)} overdue={e.overdue} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{e.label}</p>
              <p className="text-xs text-steel">
                {kindLabel(e.kind, e.overdue)} · {fullDate(e.t)} · {e.estimated ? "about " : ""}
                {mi(e.miles)} mi
              </p>
            </div>
            {e.href && (
              <Link href={e.href} aria-label={`Edit ${e.label}`} title="Edit" className="icon-btn">
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
