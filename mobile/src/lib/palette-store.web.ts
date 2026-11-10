// Browser previews: the same key the website uses for its own palette choice.
const KEY = "revlog-palette";

export function savedPaletteId() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function applyPalette(id: string) {
  localStorage.setItem(KEY, id);
  location.reload();
}
