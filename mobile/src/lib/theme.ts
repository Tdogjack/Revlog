import { savedPaletteId } from "@/lib/palette-store";

// The palettes from the website's src/app/globals.css. Keep the two in step.
// The names date from Shop floor, the default: "amber" is the accent and
// "asphalt" the page, whatever colors a palette gives them.
type Colors = {
  asphalt: string;
  panel: string;
  graphite: string;
  // The accent for text and icons, and the fill behind onAmber content.
  amber: string;
  amberFill: string;
  amberPressed: string;
  onAmber: string;
  steel: string;
  chalk: string;
  rule: string;
  edge: string;
  fieldEdge: string;
  label: string;
  placeholder: string;
  due: string;
  dueBg: string;
  overdue: string;
  overdueBg: string;
  done: string;
  doneBg: string;
  chartService: string;
  chartMods: string;
};

const redline: Colors = {
  asphalt: "#0d0f12",
  panel: "#15181c",
  graphite: "#262b32",
  amber: "#e5484d",
  amberFill: "#cf3a40",
  amberPressed: "#b5313a",
  onAmber: "#ffffff",
  steel: "#a1aab6",
  chalk: "#eef0f2",
  rule: "#1f2329",
  edge: "#3a414b",
  fieldEdge: "#69727f",
  label: "#ccd2da",
  placeholder: "#747e8c",
  due: "#f1b84b",
  dueBg: "#3a2c0f",
  overdue: "#ff6b6f",
  overdueBg: "#3a1a1d",
  done: "#4fc98c",
  doneBg: "#13301f",
  chartService: "#e5484d",
  chartMods: "#4a92d4",
};

export const DEFAULT_PALETTE = "shop-floor";

export const palettes: {
  id: string;
  name: string;
  description: string;
  light?: boolean;
  colors: Colors;
}[] = [
  {
    id: DEFAULT_PALETTE,
    name: "Shop floor",
    description: "Asphalt and hazard amber",
    colors: {
      ...redline,
      asphalt: "#1c1c1e",
      panel: "#252527",
      graphite: "#36363a",
      amber: "#f2a900",
      amberFill: "#f2a900",
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
      // Checked for colorblind separation against the panel color.
      chartService: "#bd8400",
    },
  },
  { id: "redline", name: "Redline", description: "Carbon and red", colors: redline },
  {
    id: "heritage",
    name: "Heritage green",
    description: "Racing green and brass",
    colors: {
      asphalt: "#141814",
      panel: "#0b3d2e",
      graphite: "#1b5241",
      amber: "#c9a227",
      amberFill: "#c9a227",
      amberPressed: "#b08c1c",
      onAmber: "#141814",
      steel: "#c9cdb9",
      chalk: "#efe6d2",
      rule: "#134a39",
      edge: "#3f7562",
      fieldEdge: "#7f9c90",
      label: "#ddd4bf",
      placeholder: "#8a9a8d",
      due: "#f5a26b",
      dueBg: "#3f2414",
      overdue: "#ff9a90",
      overdueBg: "#3f1a1a",
      done: "#8fe3b8",
      doneBg: "#082a20",
      chartService: "#c9a227",
      chartMods: "#7cc4e8",
    },
  },
  {
    id: "voltage",
    name: "Voltage",
    description: "Midnight blue and signal lime",
    colors: {
      ...redline,
      asphalt: "#0d1b2a",
      panel: "#14263a",
      graphite: "#22374f",
      amber: "#6ea8ff",
      amberFill: "#2a6de0",
      amberPressed: "#2360c8",
      onAmber: "#ffffff",
      steel: "#a9bbd0",
      chalk: "#e8eef5",
      rule: "#1c3046",
      edge: "#415a77",
      fieldEdge: "#6f88a4",
      label: "#c9d5e3",
      placeholder: "#7d93ab",
      done: "#b5e61d",
      doneBg: "#27330a",
      chartService: "#6ea8ff",
      chartMods: "#b5e61d",
    },
  },
  {
    id: "clean-spec",
    name: "Clean spec",
    description: "Light, with safety orange",
    light: true,
    colors: {
      asphalt: "#eef0f3",
      panel: "#ffffff",
      graphite: "#d9dde3",
      amber: "#b93c0a",
      amberFill: "#ff6b1a",
      amberPressed: "#ff8142",
      onAmber: "#1b2433",
      steel: "#5b6470",
      chalk: "#1b2433",
      rule: "#e6e9ed",
      edge: "#c2c8d0",
      fieldEdge: "#7d8591",
      label: "#3a4556",
      placeholder: "#6b7480",
      due: "#7a5900",
      dueBg: "#fbf0d0",
      overdue: "#b3261e",
      overdueBg: "#fce8e6",
      done: "#17724a",
      doneBg: "#def4e8",
      chartService: "#d4500f",
      chartMods: "#2563b8",
    },
  },
];

// Read once, as the app starts. Styles are built from these colors when each
// screen's file loads, so a new choice takes effect on the next start.
const active = palettes.find((p) => p.id === savedPaletteId()) ?? palettes[0];

export const paletteId = active.id;
export const lightTheme = active.light ?? false;
export const colors = active.colors;

// A palette color at part strength, for scrims and glass.
export function alpha(hex: string, opacity: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

export const fonts = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  bold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_500Medium",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 8, lg: 14 } as const;

// Keeps text readable over a car photo. Dark palettes fade the photo into the
// page; a light page would wash the photo out, so there the shade stays dark
// and the text over it turns white.
const shade = lightTheme ? "#10151f" : colors.asphalt;
export const scrim = [alpha(shade, 0), alpha(shade, lightTheme ? 0.82 : 0.94)] as const;
export const headerScrim = [alpha(shade, lightTheme ? 0.55 : 0.7), alpha(shade, 0)] as const;
export const photoInk = lightTheme ? "#ffffff" : colors.chalk;
export const photoInkMuted = lightTheme ? "#e3e7ee" : colors.label;

// Keeps lines readable on iPad.
export const MAX_WIDTH = 640;

export const statusStyles = {
  overdue: { text: colors.overdue, bg: colors.overdueBg, label: "Overdue" },
  due_soon: { text: colors.due, bg: colors.dueBg, label: "Due soon" },
  unknown: { text: colors.steel, bg: colors.graphite, label: "Not logged" },
  ok: { text: colors.done, bg: colors.doneBg, label: "On track" },
} as const;
