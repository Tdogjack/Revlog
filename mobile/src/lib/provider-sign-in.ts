import type { Tokens } from "@revlog/api";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api, ApiError } from "@/lib/api";

export type Provider = "google" | "apple";

const FAILED = "Couldn't sign you in with that account. Try again, or use your email.";

const randomHex = (bytes: number) =>
  Array.from(Crypto.getRandomBytes(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

const toBase64Url = (base64: string) =>
  base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const isCancel = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err && err.code === "ERR_REQUEST_CANCELED";

// The iPhone's own Sign in with Apple sheet. Apple gets a hash of the nonce and
// the server gets the nonce itself, so a stolen token can't be replayed.
// Resolves to null when the person closes the sheet.
export async function signInWithAppleSheet(): Promise<Tokens | null> {
  const nonce = randomHex(32);
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new ApiError(FAILED, 401);
    return await api<Tokens>("/auth/apple", {
      method: "POST",
      body: { idToken: credential.identityToken, nonce },
    });
  } catch (err) {
    if (isCancel(err)) return null;
    throw err;
  }
}

// Google (and Apple off iOS) in a secure browser sheet. It comes back to the
// app with a one-time code that only this phone's verifier can redeem.
// Resolves to null when the person closes the sheet.
export async function signInWithBrowser(provider: Provider): Promise<Tokens | null> {
  const codeVerifier = randomHex(32);
  const codeChallenge = toBase64Url(
    await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier, {
      encoding: Crypto.CryptoEncoding.BASE64,
    }),
  );
  const redirectTo = Linking.createURL("auth-callback");
  const query = new URLSearchParams({ provider, redirectTo, codeChallenge });
  const { url } = await api<{ url: string }>(`/auth/oauth?${query}`);

  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== "success") return null;

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  if (!code) throw new ApiError(FAILED, 401);
  return api<Tokens>("/auth/oauth", { method: "POST", body: { code, codeVerifier } });
}
