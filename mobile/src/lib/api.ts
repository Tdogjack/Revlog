import type { Tokens } from "@revlog/api";
import { API_URL } from "@/lib/config";
import { clearTokens, currentTokens, saveTokens } from "@/lib/session";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    // The rest of the error response, for routes that say more than a message.
    readonly data?: unknown,
  ) {
    super(message);
  }
}

const OFFLINE = "Can't reach Revlog. Check your connection and try again.";

let onSignedOut = () => {};
export const setSignedOutHandler = (handler: () => void) => {
  onSignedOut = handler;
};

async function send(path: string, init: RequestInit) {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    // A bad request body lands here too, so keep the real cause visible.
    if (__DEV__) console.warn(`Request to ${path} failed`, err);
    throw new ApiError(OFFLINE, 0);
  }
}

// Refresh tokens work once, so parallel requests share a single refresh.
let refreshing: Promise<boolean> | null = null;

function refresh() {
  refreshing ??= (async () => {
    const refreshToken = currentTokens()?.refreshToken;
    if (!refreshToken) return false;
    const res = await send("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Only a rejected token ends the session; a server hiccup can be retried.
      if (res.status === 401) {
        await clearTokens();
        onSignedOut();
      }
      return false;
    }
    await saveTokens((await res.json()) as Tokens);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const expiringSoon = (tokens: Tokens) =>
  tokens.expiresAt != null && tokens.expiresAt - 60 < Date.now() / 1000;

// For requests that can't go through api(), like a file download.
export async function authHeaders(): Promise<Record<string, string>> {
  const tokens = currentTokens();
  if (tokens && expiringSoon(tokens)) await refresh();
  const token = currentTokens()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body, form } = options;
  const tokens = currentTokens();
  if (tokens && expiringSoon(tokens)) await refresh();

  const call = () => {
    const token = currentTokens()?.accessToken;
    return send(path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  };

  let res = await call();
  if (res.status === 401 && tokens && (await refresh())) res = await call();

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Something went wrong. Try again.", res.status, data);
  }
  return data as T;
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "Something went wrong. Try again.";
