"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "@/lib/local-date";

const noop = () => () => {};

// Today's date (YYYY-MM-DD) on the visitor's own clock; null while
// prerendering, so date-based content only renders in the browser.
export function useToday() {
  return useSyncExternalStore(noop, localToday, () => null);
}
