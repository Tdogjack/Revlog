// How tall list rows are on the car tabs. Medium stacks each row's details
// on a few lines; small fits a row on one line so more of the list shows.
// Each list keeps its own choice.
export type RowSize = "small" | "medium";
export type RowList = "build" | "service" | "reminders";

export const rowSizeCookie = (list: RowList) => `revlog-rows-${list}`;

export function parseRowSize(value: string | undefined): RowSize {
  return value === "small" ? "small" : "medium";
}
