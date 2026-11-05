// Shared by the server (validation) and the browser (the forms' dropdowns).
// A service type key is either one of these built-in slugs or the id of a
// type the user created themselves.
export const SERVICE_CATEGORIES = [
  { value: "oil", label: "Oil change" },
  { value: "rotation", label: "Tire rotation" },
  { value: "tires", label: "Tires" },
  { value: "brakes", label: "Brakes" },
  { value: "brake-fluid", label: "Brake fluid" },
  { value: "air-filter", label: "Engine air filter" },
  { value: "cabin-filter", label: "Cabin air filter" },
  { value: "coolant", label: "Coolant" },
  { value: "transmission", label: "Transmission fluid" },
  { value: "differential", label: "Differential fluid" },
  { value: "spark-plugs", label: "Spark plugs" },
  { value: "battery", label: "Battery" },
  { value: "wipers", label: "Wiper blades" },
  { value: "alignment", label: "Alignment" },
  { value: "inspection", label: "Inspection" },
  { value: "fluids", label: "Other fluids" },
  { value: "filters", label: "Other filters" },
  { value: "repair", label: "Repair" },
  { value: "other", label: "Other" },
] as const;

// Built-in types usually done by the odometer, so logging one needs a mileage.
const MILEAGE_TYPES = [
  "oil",
  "rotation",
  "tires",
  "brakes",
  "air-filter",
  "coolant",
  "transmission",
  "differential",
  "spark-plugs",
];

// Mileage-based types for a car: the built-in ones, plus any type the car
// has a mileage-interval reminder for (which covers custom types).
export function mileageTypes(
  reminders: { serviceCategory: string | null; intervalMiles: number | null }[],
) {
  const fromReminders = reminders.flatMap((r) =>
    r.serviceCategory && r.intervalMiles != null ? [r.serviceCategory] : [],
  );
  return [...new Set([...MILEAGE_TYPES, ...fromReminders])];
}

// Dropdown value that reveals the "name your new type" field.
export const NEW_TYPE = "__new";

export type CustomType = { id: string; name: string };

export function isBuiltInType(key: string) {
  return SERVICE_CATEGORIES.some((c) => c.value === key);
}

export function categoryLabel(key: string | null, customTypes: CustomType[] = []) {
  if (!key) return "Service";
  return (
    SERVICE_CATEGORIES.find((c) => c.value === key)?.label ??
    customTypes.find((t) => t.id === key)?.name ??
    "Service"
  );
}
