"use client";

import { useState, useTransition, type DragEvent, type ReactNode } from "react";
import type { ModStatus } from "@/lib/mod-categories";
import { changeModStatus } from "./mods/actions";

// The drag payload's type, so the lists only react to mods being dragged and
// not to files or text dropped on the page.
const MOD_TYPE = "application/x-revlog-mod";

type Payload = { modId: string; status: ModStatus };

// A mod row you can pick up and drop on another list (Planned to Installed,
// say). The status menu on the row does the same thing for keyboards and
// touch screens, which don't get HTML drag and drop.
export function DraggableMod({
  modId,
  status,
  className = "",
  children,
}: {
  modId: string;
  status: ModStatus;
  className?: string;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <li
      draggable
      title="Drag to another list to change its status"
      onDragStart={(e) => {
        e.dataTransfer.setData(MOD_TYPE, JSON.stringify({ modId, status } satisfies Payload));
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`${className} cursor-grab active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      {children}
    </li>
  );
}

// One status list. Dropping a mod from another list moves it here; while a
// mod is over it, the list outlines in the accent so the target is clear.
// The real garage saves through the server; the demo passes `onMove` to
// change its in-memory cars instead.
export function ModDropZone({
  vehicleId,
  status,
  onMove,
  className = "",
  children,
}: {
  vehicleId: string;
  status: ModStatus;
  onMove?: (modId: string, status: ModStatus) => void;
  className?: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  const accepts = (e: DragEvent) => e.dataTransfer.types.includes(MOD_TYPE);

  return (
    <section
      onDragOver={(e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        // Leaving for a child row still counts as being over the list.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        if (!accepts(e)) return;
        e.preventDefault();
        const { modId, status: from } = JSON.parse(e.dataTransfer.getData(MOD_TYPE)) as Payload;
        if (from === status) return;
        if (onMove) {
          onMove(modId, status);
          return;
        }
        const form = new FormData();
        form.set("status", status);
        startTransition(() => changeModStatus(vehicleId, modId, form));
      }}
      aria-busy={pending || undefined}
      className={`${className} transition-[outline-color,opacity] duration-150 ${
        over ? "outline-2 outline-offset-2 outline-redline outline-dashed" : "outline-transparent"
      } ${pending ? "opacity-70" : ""}`}
    >
      {children}
    </section>
  );
}
