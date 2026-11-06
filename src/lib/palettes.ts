// Palettes people can pick in Settings. The choice is saved per browser. Each id
// other than the base needs a matching data-theme block in globals.css.

// What visitors get until they pick something, set on <html> in the root layout.
export const DEFAULT_PALETTE = "shop-floor";
// Lives in @theme in globals.css, so it's the one palette with no data-theme.
export const BASE_PALETTE = "redline";
export const PALETTE_STORAGE_KEY = "revlog-palette";

export const palettes = [
  {
    id: DEFAULT_PALETTE,
    name: "Shop floor",
    description: "Asphalt and hazard amber",
    swatches: ["#1c1c1e", "#36363a", "#f2a900"],
  },
  {
    id: BASE_PALETTE,
    name: "Redline",
    description: "Carbon and red",
    swatches: ["#0d0f12", "#262b32", "#e5484d"],
  },
  {
    id: "heritage",
    name: "Heritage green",
    description: "Racing green and brass",
    swatches: ["#141814", "#0b3d2e", "#c9a227"],
  },
  {
    id: "voltage",
    name: "Voltage",
    description: "Midnight blue and signal lime",
    swatches: ["#0d1b2a", "#2a6de0", "#b5e61d"],
  },
  {
    id: "clean-spec",
    name: "Clean spec",
    description: "Light, with safety orange",
    swatches: ["#ffffff", "#eef0f3", "#ff6b1a"],
  },
];

const paletteIds = palettes.map(({ id }) => id);

// Inlined in the root layout, so it can't import anything.
export const paletteScript = `try {
  var palette = localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});
  if (${JSON.stringify(paletteIds)}.indexOf(palette) !== -1) {
    if (palette === ${JSON.stringify(BASE_PALETTE)}) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = palette;
  }
} catch (e) {}`;
