"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rowSizeCookie, type RowList, type RowSize } from "@/lib/row-size";

const OPTIONS: { value: RowSize; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "One line per row, so more fits on screen" },
  { value: "medium", label: "Medium", hint: "Each row's details on their own lines" },
];

function saveRowSize(list: RowList, value: RowSize) {
  document.cookie = `${rowSizeCookie(list)}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// Picks the row size for one list on the car tabs. Saved in a cookie so the
// server draws the right rows on the next load too.
export function RowSizeToggle({ list, size }: { list: RowList; size: RowSize }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(size);

  function choose(value: RowSize) {
    if (value === shown) return;
    saveRowSize(list, value);
    startTransition(() => {
      setShown(value);
      router.refresh();
    });
  }

  return (
    <div className="segmented" role="group" aria-label="Row size">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={shown === o.value}
          title={o.hint}
          onClick={() => choose(o.value)}
          className="segment"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
