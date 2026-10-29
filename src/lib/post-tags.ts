// Shared by the share form, the feed filter, and post badges.
export const POST_TAGS = [
  { value: "build", label: "Build" },
  { value: "mod", label: "New mod" },
  { value: "progress", label: "Progress update" },
  { value: "maintenance", label: "Maintenance" },
  { value: "question", label: "Question" },
  { value: "track", label: "Track day" },
  { value: "meet", label: "Meet or event" },
  { value: "photos", label: "Photo dump" },
  { value: "detailing", label: "Detailing" },
] as const;

export type PostTag = (typeof POST_TAGS)[number]["value"];

export function isPostTag(value: string): value is PostTag {
  return POST_TAGS.some((t) => t.value === value);
}

export function postTagLabel(value: string) {
  return POST_TAGS.find((t) => t.value === value)?.label ?? "Build";
}

// Badge colors: amber for fresh mods, red for track days, the rest neutral.
export function postTagTone(value: string) {
  if (value === "mod") return "bg-due-bg text-due";
  if (value === "track") return "bg-overdue-bg text-overdue";
  if (value === "question") return "bg-done-bg text-done";
  return "bg-graphite text-chalk";
}
