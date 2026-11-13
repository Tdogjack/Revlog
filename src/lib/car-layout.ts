// Order and width of the sections on a car page. Saved in a cookie so the
// server can render the saved arrangement on the first paint.
//
// Wide and narrow sections stack in two columns so they never leave gaps
// beside each other. A full-width section spans both and starts a new pair of
// columns below it.

export const SECTION_IDS = ["mileage", "service", "reminders", "build"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

// Grid columns out of three: narrow, wide, or full.
export type SectionSpan = 1 | 2 | 3;
export type NarrowSide = "left" | "right";

export type LayoutItem = { id: SectionId; span: SectionSpan };
export type CarLayout = { side: NarrowSide; items: LayoutItem[] };

export const LAYOUT_COOKIE = "revlog-car-layout";

export const DEFAULT_LAYOUT: CarLayout = {
  side: "right",
  items: [
    { id: "mileage", span: 3 },
    { id: "service", span: 2 },
    { id: "build", span: 2 },
    { id: "reminders", span: 1 },
  ],
};

const isSectionId = (value: string): value is SectionId =>
  (SECTION_IDS as readonly string[]).includes(value);

const isSpan = (value: number): value is SectionSpan => value === 1 || value === 2 || value === 3;

// Cookie format: "R.mileage:3.service:2.build:2.reminders:1", where the first
// part is the narrow column's side. Unknown or repeated sections are dropped
// and missing ones are appended with defaults, so adding a section later
// never breaks an old cookie.
export const parseLayout = (raw: string | undefined): CarLayout => {
  if (!raw) return DEFAULT_LAYOUT;

  const parts = raw.split(".");
  let side: NarrowSide = "right";
  if (parts[0] === "L" || parts[0] === "R") {
    side = parts.shift() === "L" ? "left" : "right";
  }

  const seen = new Set<SectionId>();
  const items: LayoutItem[] = [];
  for (const part of parts) {
    const [id, spanText] = part.split(":");
    const span = Number(spanText);
    if (!id || !isSectionId(id) || !isSpan(span) || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, span });
  }

  for (const fallback of DEFAULT_LAYOUT.items) {
    if (!seen.has(fallback.id)) items.push(fallback);
  }
  return { side, items };
};

export const serializeLayout = ({ side, items }: CarLayout) =>
  [side === "left" ? "L" : "R", ...items.map(({ id, span }) => `${id}:${span}`)].join(".");

export const isDefaultLayout = (layout: CarLayout) =>
  serializeLayout(layout) === serializeLayout(DEFAULT_LAYOUT);

// Browser-only: the saved layout from document.cookie.
export const readLayoutCookie = () => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAYOUT_COOKIE}=([^;]*)`));
  return parseLayout(match?.[1]);
};

// A full-width section, or a run of wide and narrow sections side by side.
export type Band =
  | { kind: "full"; item: LayoutItem }
  | { kind: "split"; wide: LayoutItem[]; narrow: LayoutItem[]; last: SectionId };

export const toBands = (items: LayoutItem[]): Band[] => {
  const bands: Band[] = [];
  let split: Extract<Band, { kind: "split" }> | null = null;
  for (const item of items) {
    if (item.span === 3) {
      split = null;
      bands.push({ kind: "full", item });
      continue;
    }
    if (!split) {
      split = { kind: "split", wide: [], narrow: [], last: item.id };
      bands.push(split);
    }
    (item.span === 2 ? split.wide : split.narrow).push(item);
    split.last = item.id;
  }
  return bands;
};
