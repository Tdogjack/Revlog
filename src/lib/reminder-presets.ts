// Common maintenance intervals. Each preset points at a built-in service type,
// so logging that service resets the reminder. Owners' manuals vary, so these
// are starting points the user can edit.
export const REMINDER_PRESETS = [
  { type: "oil", intervalMiles: 5000, intervalMonths: 6 },
  { type: "rotation", intervalMiles: 7500, intervalMonths: null },
  { type: "air-filter", intervalMiles: 15000, intervalMonths: 12 },
  { type: "cabin-filter", intervalMiles: 15000, intervalMonths: 12 },
  { type: "brake-fluid", intervalMiles: null, intervalMonths: 24 },
  { type: "coolant", intervalMiles: 60000, intervalMonths: 60 },
  { type: "transmission", intervalMiles: 60000, intervalMonths: null },
  { type: "spark-plugs", intervalMiles: 60000, intervalMonths: null },
  { type: "wipers", intervalMiles: null, intervalMonths: 12 },
  { type: "inspection", intervalMiles: null, intervalMonths: 12 },
] as const;
