// Palettes people can pick in Settings. The choice is saved per browser. Each id
// other than the default needs a matching data-theme block in globals.css.

export const DEFAULT_PALETTE = "redline";
export const PALETTE_STORAGE_KEY = "revlog-palette";

export const palettes = [
  {
    id: DEFAULT_PALETTE,
    name: "Redline",
    description: "Carbon and red",
    swatches: ["#0d0f12", "#262b32", "#e5484d"],
  },
  {
    id: "shop-floor",
    name: "Shop floor",
    description: "Asphalt and hazard amber",
    swatches: ["#1c1c1e", "#36363a", "#f2a900"],
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

const themedIds = palettes.map(({ id }) => id).filter((id) => id !== DEFAULT_PALETTE);

// Inlined in the root layout, so it can't import anything.
export const paletteScript = `try {
  var palette = localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});
  if (${JSON.stringify(themedIds)}.indexOf(palette) !== -1) {
    document.documentElement.dataset.theme = palette;
  }
} catch (e) {}`;
