import { Feather } from "@expo/vector-icons";
import type { CarTimeline, TimelineEntry, TimelineKind } from "@revlog/api";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Rect, Stop, Text as SvgText } from "react-native-svg";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, radius, space } from "@/lib/theme";
import { DAY, mileageTicks, milesAt, milesPerMonth, timeTicks } from "@/lib/timeline";

const HEIGHT = 220;
const M = { top: 12, right: 12, bottom: 24, left: 40 };
const INSET = 12;
// Entries closer than this merge into one numbered marker.
const MERGE_PX = 20;
// A tap this close to a marker selects it, since markers are small for fingers.
const TAP_PX = 28;

const RANGES = [
  { id: "6m", label: "6M", days: 182 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const KINDS: { kind: TimelineKind; label: string }[] = [
  { kind: "service", label: "Service" },
  { kind: "mod", label: "Mods" },
  { kind: "reading", label: "Odometer" },
  { kind: "due", label: "Upcoming" },
];

type Cluster = { key: string; x: number; y: number; events: TimelineEntry[] };

const mi = (n: number) => n.toLocaleString("en-US");
const fmt = (t: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(t).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
const fullDate = (t: number) => fmt(t, { month: "short", day: "numeric", year: "numeric" });

const kindName = (e: TimelineEntry) =>
  e.overdue ? "Overdue" : { service: "Service", mod: "Mod", reading: "Reading", due: "Due" }[e.kind];

const markerColor = (e: { kind: TimelineKind; overdue?: boolean }) =>
  e.kind === "service"
    ? colors.chartService
    : e.kind === "mod"
      ? colors.chartMods
      : e.kind === "due"
        ? e.overdue
          ? colors.overdue
          : colors.due
        : colors.panel;

function clusterDate(c: Cluster) {
  const a = c.events[0].t;
  const b = c.events[c.events.length - 1].t;
  return a === b ? fullDate(a) : `${fullDate(a)} to ${fullDate(b)}`;
}

// A shape as well as a color, so the kinds don't rely on color alone.
function Marker({ cluster, active }: { cluster: Cluster; active: boolean }) {
  const { x, y, events } = cluster;
  const [first] = events;
  const ring = active ? colors.chalk : colors.asphalt;
  if (events.length > 1) {
    return (
      <>
        <Rect
          x={x - 10}
          y={y - 10}
          width={20}
          height={20}
          rx={4}
          fill={colors.asphalt}
          stroke={active ? colors.chalk : colors.steel}
          strokeWidth={2}
        />
        <SvgText
          x={x}
          y={y + 4}
          fontSize={11}
          fontFamily={fonts.mono}
          fill={colors.chalk}
          textAnchor="middle"
        >
          {events.length}
        </SvgText>
      </>
    );
  }
  if (first.kind === "service") {
    return (
      <Rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        rx={2}
        fill={markerColor(first)}
        stroke={ring}
        strokeWidth={2}
      />
    );
  }
  if (first.kind === "due") {
    return (
      <Rect
        x={x - 5}
        y={y - 5}
        width={10}
        height={10}
        rx={1}
        rotation={45}
        originX={x}
        originY={y}
        fill={markerColor(first)}
        stroke={ring}
        strokeWidth={2}
      />
    );
  }
  if (first.kind === "mod") {
    return <Circle cx={x} cy={y} r={6.5} fill={markerColor(first)} stroke={ring} strokeWidth={2} />;
  }
  return (
    <Circle
      cx={x}
      cy={y}
      r={4.5}
      fill={colors.asphalt}
      stroke={active ? colors.amber : colors.chalk}
      strokeWidth={2}
    />
  );
}

function EntryRow({ entry }: { entry: TimelineEntry }) {
  const detail = `${kindName(entry)}, ${fullDate(entry.t)}, ${entry.estimated ? "about " : ""}${mi(entry.miles)} mi`;
  const body = (
    <>
      <View style={styles.entryText}>
        <Text style={styles.entryTitle}>{entry.label}</Text>
        <Text style={styles.small}>{detail}</Text>
      </View>
      {entry.href && <Feather name="chevron-right" size={20} color={colors.placeholder} />}
    </>
  );
  if (!entry.href) return <View style={styles.entry}>{body}</View>;
  const { href } = entry;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}, ${detail}`}
      style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
      onPress={() => router.push(href as never)}
    >
      {body}
    </Pressable>
  );
}

// The odometer over time: tap the graph to read a date or open what was done
// there, and narrow it by time. Dragging is left to the page's scrolling.
export function MileageGraph({ timeline }: { timeline: CarTimeline }) {
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<RangeId>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [readT, setReadT] = useState<number | null>(null);
  const [list, setList] = useState(false);
  const { projection } = timeline;

  const span = (timeline.end - timeline.start) / DAY;
  const ranges = RANGES.filter((r) => r.id === "all" || span > r.days * 1.2);

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    const start = Math.max(timeline.start, timeline.end - days * DAY);
    const end = projection ? projection[projection.length - 1].t : timeline.end;
    // Enter from the left edge when the range cuts the line.
    const line = [
      ...(start > timeline.start ? [{ t: start, miles: milesAt(timeline.line, start) }] : []),
      ...timeline.line.filter((p) => p.t >= start),
    ];
    const ahead = projection ?? [];
    const miles = [...line, ...ahead].map((p) => p.miles);
    const ticks = mileageTicks(Math.min(...miles), Math.max(...miles));
    const full = [...line, ...ahead.slice(1)];
    return { start, end, line, full, ticks, lo: ticks[0], hi: ticks[ticks.length - 1] };
  }, [timeline, range, projection]);

  const plotW = Math.max(width - M.left - M.right, 1);
  const plotH = HEIGHT - M.top - M.bottom;
  const innerW = Math.max(plotW - INSET * 2, 1);
  const sx = (t: number) => M.left + INSET + ((t - view.start) / (view.end - view.start)) * innerW;
  const sy = (m: number) => M.top + (1 - (m - view.lo) / (view.hi - view.lo)) * plotH;
  const tAt = (x: number) =>
    view.start + ((x - M.left - INSET) / innerW) * (view.end - view.start);

  const visible = timeline.events.filter((e) => e.t >= view.start);

  // Left-to-right merge, so markers too close to tap apart become one list.
  const clusters: Cluster[] = [];
  if (width) {
    let anchor = { x: -Infinity, y: 0 };
    for (const e of visible) {
      const x = sx(e.t);
      const y = sy(e.miles);
      const last = clusters[clusters.length - 1];
      if (last && x - anchor.x <= MERGE_PX && Math.abs(y - anchor.y) <= MERGE_PX * 1.5) {
        last.events.push(e);
      } else {
        clusters.push({ key: e.key, x, y, events: [e] });
        anchor = { x, y };
      }
    }
    for (const c of clusters) {
      c.x = c.events.reduce((s, e) => s + sx(e.t), 0) / c.events.length;
      c.y = c.events.reduce((s, e) => s + sy(e.miles), 0) / c.events.length;
    }
  }

  const active = clusters.find((c) => c.events.some((e) => e.key === selected));

  const tap = (x: number, y: number) => {
    tapFeedback();
    const near = clusters.reduce<{ cluster: Cluster; d: number } | null>((best, cluster) => {
      const d = Math.hypot(cluster.x - x, cluster.y - y);
      return d <= TAP_PX && (!best || d < best.d) ? { cluster, d } : best;
    }, null);
    if (near) {
      setSelected(near.cluster.events[0].key);
      setReadT(null);
      return;
    }
    setSelected(null);
    setReadT(Math.min(Math.max(tAt(x), view.start), view.end));
  };

  const first = view.line[0];
  const latest = view.line[view.line.length - 1];
  const shownT = active ? active.events[0].t : (readT ?? latest.t);
  const shownMiles = active
    ? Math.round(active.events.reduce((s, e) => s + e.miles, 0) / active.events.length)
    : milesAt(view.full, shownT);
  const ahead = shownT > latest.t;
  const monthly = milesPerMonth(first, latest);
  const summary = active
    ? clusterDate(active)
    : readT != null
      ? ahead
        ? `Projected, ${fullDate(shownT)}`
        : fullDate(shownT)
      : [
          `Latest, ${fullDate(latest.t)}`,
          `+${mi(latest.miles - first.miles)} mi`,
          monthly != null ? `${mi(monthly)}/mo` : null,
        ]
          .filter(Boolean)
          .join(", ");

  const path = view.line.map((p) => `${sx(p.t)},${sy(p.miles)}`).join(" ");
  const projPath = projection?.map((p) => `${sx(p.t)},${sy(p.miles)}`).join(" ");
  const { ticks: xTicks, yearly } = timeTicks(view.start, view.end);
  const kinds = KINDS.filter((k) => timeline.events.some((e) => e.kind === k.kind));

  return (
    <View style={styles.graph}>
      <View style={styles.head}>
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.miles}>
            {ahead ? "~" : ""}
            {mi(shownMiles)}
            <Text style={styles.unit}> mi</Text>
          </Text>
          <Text style={styles.small}>{summary}</Text>
        </View>
        {ranges.length > 1 && (
          <View style={styles.ranges}>
            {ranges.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityState={{ selected: range === r.id }}
                accessibilityLabel={`Show ${r.label}`}
                hitSlop={4}
                style={[styles.range, range === r.id && styles.rangeOn]}
                onPress={() => {
                  setRange(r.id);
                  setSelected(null);
                  setReadT(null);
                }}
              >
                <Text style={[styles.rangeLabel, range === r.id && styles.rangeLabelOn]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable
        accessibilityLabel="Mileage graph. Tap Show as a list for every entry."
        style={{ height: HEIGHT }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => tap(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      >
        {width > 0 && (
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.chalk} stopOpacity={0.09} />
                <Stop offset="1" stopColor={colors.chalk} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {view.ticks.map((v) => (
              <Line
                key={v}
                x1={M.left}
                x2={width - M.right}
                y1={sy(v)}
                y2={sy(v)}
                stroke={colors.rule}
              />
            ))}
            {view.ticks.map((v) => (
              <SvgText
                key={v}
                x={M.left - 8}
                y={sy(v) + 4}
                fontSize={11}
                fontFamily={fonts.mono}
                fill={colors.steel}
                textAnchor="end"
              >
                {v >= 1000 ? `${mi(v / 1000)}k` : v}
              </SvgText>
            ))}
            {xTicks.map((t) => (
              <SvgText
                key={t}
                x={sx(t)}
                y={HEIGHT - 6}
                fontSize={11}
                fontFamily={fonts.regular}
                fill={colors.steel}
                textAnchor="middle"
              >
                {fmt(t, yearly ? { year: "numeric" } : { month: "short" })}
              </SvgText>
            ))}
            <Polygon
              points={`${path} ${sx(latest.t)},${M.top + plotH} ${sx(first.t)},${M.top + plotH}`}
              fill="url(#fill)"
            />
            {projPath && (
              <Polyline
                points={projPath}
                fill="none"
                stroke={colors.steel}
                strokeWidth={2}
                strokeDasharray="2 5"
                strokeLinecap="round"
              />
            )}
            <Polyline
              points={path}
              fill="none"
              stroke={colors.chalk}
              strokeOpacity={0.8}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {readT != null && (
              <>
                <Line
                  x1={sx(readT)}
                  x2={sx(readT)}
                  y1={M.top}
                  y2={M.top + plotH}
                  stroke={colors.steel}
                  strokeDasharray="3 3"
                />
                <Circle cx={sx(readT)} cy={sy(shownMiles)} r={4} fill={colors.chalk} />
              </>
            )}
            {clusters.map((c) => (
              <Marker key={c.key} cluster={c} active={active?.key === c.key} />
            ))}
          </Svg>
        )}
      </Pressable>

      <View style={styles.legend} accessibilityElementsHidden>
        {kinds.map(({ kind, label }) => (
          <View key={kind} style={styles.key}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: markerColor({ kind }) },
                kind === "mod" && styles.swatchRound,
                kind === "reading" && styles.swatchHollow,
                kind === "due" && styles.swatchDiamond,
              ]}
            />
            <Text style={styles.small}>{label}</Text>
          </View>
        ))}
      </View>

      {active && (
        <View style={styles.panel}>
          {active.events.map((e) => (
            <EntryRow key={e.key} entry={e} />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: list }}
        style={styles.toggle}
        onPress={() => setList(!list)}
      >
        <Text style={styles.toggleLabel}>{list ? "Hide list" : "Show as a list"}</Text>
      </Pressable>
      {list && (
        <View style={styles.panel}>
          {[...visible].reverse().map((e) => (
            <EntryRow key={e.key} entry={e} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  graph: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  readout: { flex: 1, gap: 2, minHeight: 58 },
  miles: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 24, lineHeight: 30 },
  unit: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
  small: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  ranges: { flexDirection: "row", gap: space.xs },
  range: {
    minWidth: 36,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  rangeOn: { backgroundColor: colors.graphite },
  rangeLabel: { color: colors.steel, fontFamily: fonts.medium, fontSize: 13 },
  rangeLabelOn: { color: colors.chalk },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  key: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  swatchRound: { borderRadius: 5 },
  swatchHollow: { borderRadius: 5, borderWidth: 2, borderColor: colors.chalk },
  swatchDiamond: { transform: [{ rotate: "45deg" }] },
  panel: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  entryPressed: { backgroundColor: colors.graphite },
  entryText: { flex: 1, gap: 2 },
  entryTitle: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  toggle: { minHeight: 44, justifyContent: "center" },
  toggleLabel: { color: colors.amber, fontFamily: fonts.medium, fontSize: 15 },
});
