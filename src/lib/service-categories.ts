// Shared by the server (validation) and the browser (the form's dropdown).
export const SERVICE_CATEGORIES = [
  { value: "oil", label: "Oil change" },
  { value: "tires", label: "Tires" },
  { value: "brakes", label: "Brakes" },
  { value: "fluids", label: "Fluids" },
  { value: "filters", label: "Filters" },
  { value: "battery", label: "Battery" },
  { value: "inspection", label: "Inspection" },
  { value: "repair", label: "Repair" },
  { value: "other", label: "Other" },
] as const;

export function categoryLabel(value: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? "Service";
}
