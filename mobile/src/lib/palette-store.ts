import { reloadAppAsync } from "expo";
import * as SecureStore from "expo-secure-store";

const KEY = "revlog.palette";

// Read without waiting, because the colors are needed before anything draws.
export function savedPaletteId() {
  try {
    return SecureStore.getItem(KEY);
  } catch {
    return null;
  }
}

// Saves the choice and starts the app again in the new colors.
export async function applyPalette(id: string) {
  await SecureStore.setItemAsync(KEY, id);
  await reloadAppAsync();
}
