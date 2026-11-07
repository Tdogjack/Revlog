// Shop floor, from the website's src/app/globals.css. Keep the two in step.
export const colors = {
  asphalt: "#1c1c1e",
  panel: "#252527",
  graphite: "#36363a",
  amber: "#f2a900",
  amberPressed: "#d99700",
  onAmber: "#1c1c1e",
  steel: "#b8b5ad",
  chalk: "#fafaf7",
  rule: "#2e2e31",
  edge: "#4a4a4e",
  fieldEdge: "#7e7c78",
  label: "#d6d3cb",
  placeholder: "#8c8a84",
  due: "#ff9a5c",
  dueBg: "#40230f",
  overdue: "#ff7377",
  overdueBg: "#3a1a1d",
  done: "#4fc98c",
  doneBg: "#13301f",
  // Checked for colorblind separation against the panel color.
  chartService: "#bd8400",
  chartMods: "#4a92d4",
} as const;

export const fonts = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  bold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_500Medium",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 8, lg: 14 } as const;

// Keeps text readable over a car photo.
export const scrim = ["rgba(28, 28, 30, 0)", "rgba(28, 28, 30, 0.94)"] as const;

// Keeps lines readable on iPad.
export const MAX_WIDTH = 640;

export const statusStyles = {
  overdue: { text: colors.overdue, bg: colors.overdueBg, label: "Overdue" },
  due_soon: { text: colors.due, bg: colors.dueBg, label: "Due soon" },
  unknown: { text: colors.steel, bg: colors.graphite, label: "Not logged" },
  ok: { text: colors.done, bg: colors.doneBg, label: "On track" },
} as const;
