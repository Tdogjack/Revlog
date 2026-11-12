"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { POST_SORTS, type PostSort } from "@/lib/post-sorts";

// The feed's "Sort by" dropdown. Each option is a link, so the choice lives in
// the URL and survives refreshes and sharing.
export function SortMenu({ sort, tag, q }: { sort: PostSort; tag?: string; q?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = POST_SORTS.find((s) => s.value === sort) ?? POST_SORTS[0];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const href = (value: PostSort) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (tag) query.set("tag", tag);
    query.set("sort", value);
    return `/community?${query}`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn min-h-10"
      >
        <span className="text-steel">Sort</span>
        {current.label}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="pop-in absolute top-full right-0 z-20 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-edge bg-panel p-1 shadow-2xl shadow-black/50"
        >
          <p className="px-4 pt-2 pb-1 text-xs font-medium text-steel">Sort by</p>
          {POST_SORTS.map((s) => {
            const active = s.value === sort;
            return (
              <Link
                key={s.value}
                href={href(s.value)}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => setOpen(false)}
                className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 ${active ? "bg-graphite" : "hover:bg-graphite active:bg-graphite"}`}
              >
                <span>
                  <span className="block text-sm text-chalk">{s.label}</span>
                  <span className="block text-xs text-steel">{s.hint}</span>
                </span>
                {active && <Check className="h-4 w-4 text-redline" aria-hidden />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
