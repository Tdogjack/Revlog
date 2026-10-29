// Shared by the server (validation) and the browser (the form's dropdowns).
export const MOD_CATEGORIES = [
  { value: "engine", label: "Engine and intake" },
  { value: "exhaust", label: "Exhaust" },
  { value: "tuning", label: "Tuning" },
  { value: "suspension", label: "Suspension" },
  { value: "wheels", label: "Wheels and tires" },
  { value: "brakes", label: "Brakes" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "lighting", label: "Lighting" },
  { value: "electronics", label: "Audio and electronics" },
  { value: "other", label: "Other" },
] as const;

export const MOD_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "installed", label: "Installed" },
  { value: "removed", label: "Removed" },
] as const;

export type ModStatus = (typeof MOD_STATUSES)[number]["value"];

export function modCategoryLabel(value: string | null) {
  return MOD_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}
