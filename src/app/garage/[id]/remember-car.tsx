"use client";

import { useEffect } from "react";
import { CURRENT_CAR_COOKIE } from "@/lib/current-car";

// Notes the open car so the Garage tab comes back to it, and scrolls its
// tile into view when the row is wider than the screen.
export function RememberCar({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = `${CURRENT_CAR_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    // Scroll to the tile's own snap point; a plain scrollIntoView lands
    // between snap points and gets pulled back to the first tile.
    const row = document.querySelector<HTMLElement>('nav[aria-label="Your cars"] ul');
    const tile = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !tile) return;
    const rowBox = row.getBoundingClientRect();
    const tileBox = tile.getBoundingClientRect();
    if (tileBox.left >= rowBox.left && tileBox.right <= rowBox.right) return;
    const inset = parseFloat(getComputedStyle(row).paddingLeft);
    row.scrollLeft += tileBox.left - rowBox.left - inset;
  }, [id]);
  return null;
}
