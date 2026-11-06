import type { Tokens } from "@revlog/api";
import * as SecureStore from "expo-secure-store";

const KEYS = { access: "revlog.access", refresh: "revlog.refresh", expires: "revlog.expires" };

let tokens: Tokens | null = null;

export const currentTokens = () => tokens;

export async function loadTokens() {
  const [accessToken, refreshToken, expires] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
    SecureStore.getItemAsync(KEYS.expires),
  ]);
  tokens =
    accessToken && refreshToken
      ? { accessToken, refreshToken, expiresAt: expires ? Number(expires) : null }
      : null;
  return tokens;
}

export async function saveTokens(next: Tokens) {
  tokens = next;
  await Promise.all([
    SecureStore.setItemAsync(KEYS.access, next.accessToken),
    SecureStore.setItemAsync(KEYS.refresh, next.refreshToken),
    SecureStore.setItemAsync(KEYS.expires, String(next.expiresAt ?? "")),
  ]);
}

export async function clearTokens() {
  tokens = null;
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
