"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, LayoutGrid } from "lucide-react";
import {
  DEFAULT_LAYOUT,
  isDefaultLayout,
  LAYOUT_COOKIE,
  serializeLayout,
  toBands,
  type Band,
  type CarLayout,
  type LayoutItem,
  type NarrowSide,
  type SectionId,
  type SectionSpan,
} from "@/lib/car-layout";

export type GridSection = { label: string; node: ReactNode };

type SectionGridProps = {
  initialLayout: CarLayout;
  sections: Record<SectionId, GridSection>;
};

const SIDE_OPTIONS: { side: NarrowSide; label: string }[] = [
  { side: "left", label: "Left" },
  { side: "right", label: "Right" },
];

const SPAN_OPTIONS: { span: SectionSpan; label: string }[] = [
  { span: 1, label: "Narrow" },
  { span: 2, label: "Wide" },
  { span: 3, label: "Full" },
];

const ONE_YEAR = 60 * 60 * 24 * 365;

const saveLayout = (layout: CarLayout) => {
  document.cookie = `${LAYOUT_COOKIE}=${serializeLayout(layout)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const moveItem = (items: LayoutItem[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

// Moves the dragged section next to another one, optionally changing width.
const placeNear = (
  items: LayoutItem[],
  dragId: SectionId,
  anchorId: SectionId,
  after: boolean,
  span?: SectionSpan,
) => {
  const dragged = items.find((item) => item.id === dragId);
  if (!dragged) return items;
  if (anchorId === dragId) return items.map((item) => (item.id === dragId ? { ...item, span: span ?? item.span } : item));
  const rest = items.filter((item) => item.id !== dragId);
  const at = rest.findIndex((item) => item.id === anchorId);
  if (at < 0) return items;
  rest.splice(at + (after ? 1 : 0), 0, { ...dragged, span: span ?? dragged.span });
  return rest;
};

// Up and down step past sections in the other column, since swapping with
// those changes nothing on screen.
const stepInColumn = (items: LayoutItem[], from: number, step: number) => {
  const { span } = items[from];
  for (let to = from + step; to >= 0 && to < items.length; to += step) {
    if (span === 3 || items[to].span === span || items[to].span === 3) return to;
  }
  return from;
};

const sameItems = (a: LayoutItem[], b: LayoutItem[]) =>
  a.length === b.length && a.every((item, i) => item.id === b[i].id && item.span === b[i].span);

type DragState = {
  id: SectionId;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  pointerX: number;
  pointerY: number;
  startScroll: number;
};

const SLIDE = "transform 200ms var(--ease-sheet)";

const beginDrag = (el: HTMLElement, id: SectionId, x: number, y: number): DragState => {
  el.style.transition = "none";
  return {
    id,
    startX: x,
    startY: y,
    originLeft: el.offsetLeft,
    originTop: el.offsetTop,
    pointerX: x,
    pointerY: y,
    startScroll: window.scrollY,
  };
};

// Keeps the dragged section under the pointer, measured from its slot in the
// grid (offsetLeft/Top ignore the transform) so a reorder doesn't jolt it.
const placeDragged = (state: DragState, items: Map<SectionId, HTMLElement>) => {
  const el = items.get(state.id);
  if (!el) return;
  el.style.transition = "none";
  const dx = state.pointerX - state.startX - (el.offsetLeft - state.originLeft);
  const scrolled = window.scrollY - state.startScroll;
  const dy = state.pointerY - state.startY + scrolled - (el.offsetTop - state.originTop);
  el.style.transform = `translate(${dx}px, ${dy}px)`;
};

// Page scroll speed when the pointer is near the top or bottom edge, so a
// section can be dragged past what fits on screen.
const EDGE = 72;
const edgeSpeed = (y: number) => {
  const bottom = window.innerHeight - EDGE;
  if (y < EDGE) return -Math.ceil((EDGE - y) / 4);
  if (y > bottom) return Math.ceil((y - bottom) / 4);
  return 0;
};

// Drops the dragged section into its slot.
const settle = (el: HTMLElement | undefined) => {
  if (!el) return;
  el.style.transition = prefersReducedMotion() ? "none" : SLIDE;
  el.style.transform = "";
};

const hasColumns = () => window.matchMedia("(min-width: 48rem)").matches;

// A section's resting place in the grid. offsetTop ignores transforms, so
// sections that are still sliding into place don't count where they look.
type Box = { top: number; bottom: number };
const restingBox = (container: HTMLElement, ids: SectionId[]): Box | null => {
  let box: Box | null = null;
  for (const id of ids) {
    const el = container.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
    if (!el) continue;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    box = box ? { top: Math.min(box.top, top), bottom: Math.max(box.bottom, bottom) } : { top, bottom };
  }
  return box;
};
const middle = (box: Box) => (box.top + box.bottom) / 2;

// The sections the dragged one can trade places with by moving up or down,
// each as a group of ids moved past together. On a phone that's every
// section. A wide or narrow section moves within its column and past
// full-width ones. A full-width section moves past whole rows.
const verticalNeighbors = (items: LayoutItem[], dragged: LayoutItem): SectionId[][] => {
  if (!hasColumns()) return items.map((item) => [item.id]);
  if (dragged.span === 3) {
    return toBands(items).map((band) =>
      band.kind === "full"
        ? [band.item.id]
        : items.filter((item) => band.wide.includes(item) || band.narrow.includes(item)).map((item) => item.id),
    );
  }
  return items.filter((item) => item.span === dragged.span || item.span === 3).map((item) => [item.id]);
};

// Where the dragged section should go now, or null to leave it. It swaps with
// a neighbor only once its own edge passes the middle of that neighbor's
// resting place. Swapping back needs the same move the other way, so a
// section held near a boundary doesn't flip back and forth.
const reorderFor = (
  items: LayoutItem[],
  dragId: SectionId,
  el: HTMLElement,
  container: HTMLElement,
  pointerX: number,
): LayoutItem[] | null => {
  const dragged = items.find((item) => item.id === dragId);
  if (!dragged) return null;

  const frame = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const top = rect.top - frame.top;
  const bottom = rect.bottom - frame.top;
  const center = (top + bottom) / 2;

  // Across: the pointer is over the other column of the same row.
  if (hasColumns() && dragged.span !== 3) {
    const column = el.parentElement;
    const other = column?.parentElement
      ? [...column.parentElement.children].find(
          (child): child is HTMLElement => child !== column && child instanceof HTMLElement && !!child.dataset.dropColumn,
        )
      : undefined;
    const x = pointerX - frame.left;
    if (other && x >= other.offsetLeft && x <= other.offsetLeft + other.offsetWidth) {
      const span = Number(other.dataset.dropColumn) as SectionSpan;
      const members = [...other.querySelectorAll<HTMLElement>("[data-section-id]")].map(
        (node) => node.dataset.sectionId as SectionId,
      );
      const below = members.find((id) => {
        const box = restingBox(container, [id]);
        return box ? middle(box) > center : false;
      });
      if (below) return placeNear(items, dragId, below, false, span);
      return placeNear(items, dragId, members.at(-1) ?? (other.dataset.dropAfter as SectionId), true, span);
    }
  }

  // Up or down within its stack.
  const index = items.indexOf(dragged);
  const order = (id: SectionId) => items.findIndex((item) => item.id === id);
  const groups = verticalNeighbors(items, dragged).filter((ids) => !ids.includes(dragId));
  const above = groups.filter((ids) => order(ids[ids.length - 1]) < index).at(-1);
  const after = groups.find((ids) => order(ids[0]) > index);

  const aboveBox = above && restingBox(container, above);
  if (above && aboveBox && top < middle(aboveBox)) return placeNear(items, dragId, above[0], false);

  const afterBox = after && restingBox(container, after);
  if (after && afterBox && bottom > middle(afterBox)) {
    return placeNear(items, dragId, after[after.length - 1], true);
  }
  return null;
};

// Where every section sits now, so the next render can slide them from here.
const captureRects = (items: Map<SectionId, HTMLElement>, skip: SectionId | undefined) => {
  const rects = new Map<SectionId, DOMRect>();
  items.forEach((el, id) => {
    if (id !== skip) rects.set(id, el.getBoundingClientRect());
  });
  return rects;
};

const slideFrom = (rects: Map<SectionId, DOMRect>, items: Map<SectionId, HTMLElement>) => {
  if (prefersReducedMotion()) return;
  rects.forEach((before, id) => {
    const el = items.get(id);
    if (!el) return;
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (!dx && !dy) return;
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.getBoundingClientRect();
    el.style.transition = SLIDE;
    el.style.transform = "";
  });
};

// The car page sections: wide ones stacked in one column, narrow ones in the
// other, and full-width ones across both. "Arrange" lets you drag them around,
// set each one's width, and pick the narrow column's side. Phones stack
// everything in one column in the saved order.
export function SectionGrid({ initialLayout, sections }: SectionGridProps) {
  const [layout, setLayout] = useState(initialLayout);
  const [arranging, setArranging] = useState(false);
  const [draggingId, setDraggingId] = useState<SectionId | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const itemRefs = useRef(new Map<SectionId, HTMLDivElement>());
  const flipRects = useRef<Map<SectionId, DOMRect> | null>(null);
  const drag = useRef<DragState | null>(null);
  const layoutRef = useRef(initialLayout);
  const refocus = useRef<SectionId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = useCallback((next: CarLayout) => {
    const current = layoutRef.current;
    if (next.side === current.side && sameItems(next.items, current.items)) return;
    flipRects.current = captureRects(itemRefs.current, drag.current?.id);
    layoutRef.current = next;
    setLayout(next);
    saveLayout(next);
  }, []);

  const commitItems = useCallback(
    (items: LayoutItem[]) => commit({ ...layoutRef.current, items }),
    [commit],
  );

  useLayoutEffect(() => {
    if (drag.current) placeDragged(drag.current, itemRefs.current);
    // A section that changes column is a new element, so put keyboard focus
    // back on its handle.
    if (refocus.current) {
      itemRefs.current.get(refocus.current)?.querySelector<HTMLElement>("[data-handle]")?.focus();
      refocus.current = null;
    }
    const rects = flipRects.current;
    flipRects.current = null;
    if (rects) slideFrom(rects, itemRefs.current);
  }, [layout]);

  // While a drag is live, follow the pointer on the window so it keeps
  // working when the pointer leaves the handle.
  useEffect(() => {
    if (!draggingId) return;

    let frame = 0;

    const track = (state: DragState) => {
      placeDragged(state, itemRefs.current);
      const el = itemRefs.current.get(state.id);
      const container = containerRef.current;
      if (!el || !container) return;
      const next = reorderFor(layoutRef.current.items, state.id, el, container, state.pointerX);
      if (next) commitItems(next);
    };

    const autoScroll = () => {
      const state = drag.current;
      const speed = state ? edgeSpeed(state.pointerY) : 0;
      if (!state || !speed) {
        frame = 0;
        return;
      }
      window.scrollBy(0, speed);
      track(state);
      frame = requestAnimationFrame(autoScroll);
    };

    const onMove = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
      track(state);
      if (!frame) frame = requestAnimationFrame(autoScroll);
    };

    const onUp = () => {
      const state = drag.current;
      if (state) settle(itemRefs.current.get(state.id));
      drag.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingId, commitItems]);

  useEffect(() => {
    if (!arranging) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !drag.current) setArranging(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arranging]);

  const { items, side } = layout;
  const leftSpan: SectionSpan = side === "left" ? 1 : 2;
  const rightSpan: SectionSpan = side === "left" ? 2 : 1;

  const startDrag = (id: SectionId, event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const el = itemRefs.current.get(id);
    if (!el) return;
    event.preventDefault();
    drag.current = beginDrag(el, id, event.clientX, event.clientY);
    setDraggingId(id);
  };

  const setSpan = (id: SectionId, span: SectionSpan) => {
    commitItems(items.map((item) => (item.id === id ? { ...item, span } : item)));
  };

  // Up and down move within the column; left and right move across.
  const onHandleKeyDown = (id: SectionId, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const from = items.findIndex((item) => item.id === id);
    const label = sections[id].label;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const up = event.key === "ArrowUp";
      const to = stepInColumn(items, from, up ? -1 : 1);
      if (to === from) return;
      refocus.current = id;
      commitItems(moveItem(items, from, to));
      setAnnouncement(`${label} moved ${up ? "up" : "down"}`);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const left = event.key === "ArrowLeft";
      const span = left ? leftSpan : rightSpan;
      if (items[from].span === 3 || items[from].span === span) return;
      refocus.current = id;
      setSpan(id, span);
      setAnnouncement(`${label} moved to the ${left ? "left" : "right"} column`);
    }
  };

  const renderItem = ({ id, span }: LayoutItem) => {
    const { label, node } = sections[id];
    const isDragging = draggingId === id;
    const order = items.findIndex((item) => item.id === id);
    return (
      <div
        key={id}
        data-section-id={id}
        ref={(el) => {
          if (el) itemRefs.current.set(id, el);
          else itemRefs.current.delete(id);
        }}
        style={{ "--order": order } as React.CSSProperties}
        className={`relative min-w-0 max-md:order-(--order) ${isDragging ? "z-20" : ""}`}
      >
        {arranging && (
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              data-handle
              className="icon-btn cursor-grab touch-none text-chalk active:cursor-grabbing"
              aria-label={`Move ${label}`}
              aria-roledescription="drag handle"
              onPointerDown={(event) => startDrag(id, event)}
              onKeyDown={(event) => onHandleKeyDown(id, event)}
            >
              <GripVertical className="h-5 w-5" aria-hidden />
            </button>
            <span className="min-w-24 flex-1 text-sm font-semibold">{label}</span>
            <div className="segmented max-md:hidden" role="group" aria-label={`${label} width`}>
              {SPAN_OPTIONS.map((option) => (
                <button
                  key={option.span}
                  type="button"
                  className="segment"
                  aria-pressed={span === option.span}
                  onClick={() => setSpan(id, option.span)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div
          inert={arranging}
          className={
            arranging
              ? `select-none rounded-2xl transition-shadow duration-200 ${
                  isDragging ? "shadow-2xl shadow-black/40 ring-2 ring-redline" : "ring-1 ring-edge"
                }`
              : undefined
          }
        >
          <div
            className={
              arranging
                ? "max-h-72 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
                : undefined
            }
          >
            {node}
          </div>
        </div>
      </div>
    );
  };

  // One column of a side-by-side band. Outside arrange mode an empty column
  // is left out and the other one takes the full width.
  const renderColumn = (band: Extract<Band, { kind: "split" }>, span: SectionSpan) => {
    const list = span === 2 ? band.wide : band.narrow;
    const other = span === 2 ? band.narrow : band.wide;
    if (!arranging && list.length === 0) return null;
    const width = !arranging && other.length === 0 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
    return (
      <div
        key={span}
        data-drop-column={span}
        data-drop-after={list.at(-1)?.id ?? band.last}
        className={`min-w-0 max-md:contents md:flex md:flex-col md:gap-6 ${width}`}
      >
        {list.map(renderItem)}
        {arranging && list.length === 0 && (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-edge px-4 text-center text-sm text-steel max-md:hidden">
            Drag a {span === 2 ? "wide" : "narrow"} section here
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-3">
      <div className="mb-3 flex min-h-11 flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {arranging ? (
          <>
            <p className="mr-auto text-sm text-steel">
              Drag a section by its handle. With a keyboard, focus a handle and use the arrow keys.
            </p>
            <div className="flex items-center gap-2 max-md:hidden">
              <span className="text-sm text-steel">Narrow column</span>
              <div className="segmented" role="group" aria-label="Narrow column side">
                {SIDE_OPTIONS.map((option) => (
                  <button
                    key={option.side}
                    type="button"
                    className="segment"
                    aria-pressed={side === option.side}
                    onClick={() => commit({ ...layout, side: option.side })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {!isDefaultLayout(layout) && (
              <button type="button" className="btn" onClick={() => commit(DEFAULT_LAYOUT)}>
                Reset layout
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setArranging(false)}>
              Done
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setArranging(true)}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Arrange
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div ref={containerRef} className="relative flex flex-col gap-6">
        {toBands(items).map((band, index) =>
          band.kind === "full" ? (
            renderItem(band.item)
          ) : (
            <div key={`band-${index}`} className="max-md:contents md:grid md:grid-cols-3 md:gap-6">
              {renderColumn(band, leftSpan)}
              {renderColumn(band, rightSpan)}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
