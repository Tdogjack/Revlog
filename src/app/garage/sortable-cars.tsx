"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import { orderVehicles } from "./actions";

export type SortableCar = {
  id: string;
  name: string;
  favorite: boolean;
  card: ReactNode;
  controls: ReactNode;
};

type Drag = {
  id: string;
  startY: number;
  // Each spot in the list when the drag began, top to bottom.
  slots: { top: number; height: number }[];
  from: number;
  before: string[];
};

// The garage's cars, dragged into order by the grip on each card (mouse or
// touch), or moved with the arrow keys on it. Favorites stay above the rest.
export function SortableCars({ cars }: { cars: SortableCar[] }) {
  const ids = cars.map((c) => c.id).join("|");
  const [order, setOrder] = useState(() => cars.map((c) => c.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [, startTransition] = useTransition();
  const drag = useRef<Drag | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());

  // A fresh list from the server (after saving, or a new car) wins.
  const [listed, setListed] = useState(ids);
  if (listed !== ids) {
    setListed(ids);
    setOrder(ids.split("|").filter(Boolean));
  }

  const byId = new Map(cars.map((c) => [c.id, c]));
  const shown = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));

  // The cars that slid out of the way glide to their new spots.
  useLayoutEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rows.current.forEach((el, id) => {
      const top = el.offsetTop;
      const before = tops.current.get(id);
      if (!still && before !== undefined && before !== top && id !== dragId) {
        el.animate(
          [{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }],
          { duration: 180, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
        );
      }
      tops.current.set(id, top);
    });
  }, [order, dragId]);

  // The range of spots a car can move within: its favorites group.
  const group = (list: string[], id: string) => {
    const favorite = byId.get(id)?.favorite;
    const spots = list.flatMap((cid, i) => (byId.get(cid)?.favorite === favorite ? [i] : []));
    return [spots[0], spots[spots.length - 1]] as const;
  };

  const save = (next: string[], before: string[]) => {
    if (next.join("|") === before.join("|")) return;
    startTransition(() => orderVehicles(next));
  };

  function onPointerDown(id: string, e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id,
      startY: e.clientY,
      slots: order.map((cid) => {
        const el = rows.current.get(cid);
        return { top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 };
      }),
      from: order.indexOf(id),
      before: order,
    };
    setDragId(id);
    setOffset(0);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    const start = d.slots[d.from];
    const middle = start.top + start.height / 2 + dy;
    const [lo, hi] = group(d.before, d.id);
    let target = d.from;
    let best = Infinity;
    for (let i = lo; i <= hi; i++) {
      const slot = d.slots[i];
      const distance = Math.abs(slot.top + slot.height / 2 - middle);
      if (distance < best) {
        best = distance;
        target = i;
      }
    }
    const next = d.before.filter((cid) => cid !== d.id);
    next.splice(target, 0, d.id);
    if (next.join("|") !== order.join("|")) setOrder(next);
    // Keep the card under the pointer, wherever its spot is now.
    setOffset(start.top + dy - d.slots[target].top);
  }

  function onPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragId(null);
    setOffset(0);
    save(order, d.before);
  }

  function onKeyDown(id: string, e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const from = order.indexOf(id);
    const [lo, hi] = group(order, id);
    const to = Math.min(Math.max(from + (e.key === "ArrowUp" ? -1 : 1), lo), hi);
    if (to === from) return;
    const next = order.filter((cid) => cid !== id);
    next.splice(to, 0, id);
    setOrder(next);
    setAnnouncement(`${byId.get(id)?.name} moved to spot ${to + 1} of ${order.length}.`);
    save(next, order);
  }

  return (
    <>
      <ul className="mt-8 space-y-3">
        {shown.map((car) => {
          const [lo, hi] = group(order, car.id);
          const movable = hi > lo;
          const dragging = dragId === car.id;
          return (
            <li
              key={car.id}
              ref={(el) => {
                if (el) rows.current.set(car.id, el);
                else rows.current.delete(car.id);
              }}
              // Pressing the card sinks the whole row, so the buttons beside it
              // (they can't sit inside the link) move with it. The card skips
              // its own press so it doesn't shrink twice.
              className={`relative transition-[scale] duration-400 ease-(--ease-spring) has-[>.lift:active]:duration-100 motion-safe:has-[>.lift:active]:scale-[0.985] [&>.lift:active]:transform-none ${dragging ? "z-10" : ""}`}
              style={
                dragging
                  ? {
                      transform: `translateY(${offset}px) scale(1.01)`,
                      boxShadow: "0 12px 32px rgb(0 0 0 / 0.45)",
                      borderRadius: "0.5rem",
                    }
                  : undefined
              }
            >
              {car.card}
              <div className="absolute top-2 right-2 flex flex-col items-center">
                {car.controls}
                {movable && (
                  <button
                    type="button"
                    aria-label={`Reorder ${car.name}. Drag it, or use the up and down arrow keys.`}
                    title="Drag to reorder"
                    className={`icon-btn touch-none ${dragging ? "cursor-grabbing text-chalk" : "cursor-grab"}`}
                    onPointerDown={(e) => onPointerDown(car.id, e)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={(e) => onKeyDown(car.id, e)}
                  >
                    <GripVertical className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
