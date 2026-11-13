import "server-only";
import type { Session } from "@supabase/supabase-js";
import type { Tokens } from "@/lib/api-types";
import { markEmailVerified } from "@/lib/email-verification";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { createAuthClient } from "@/lib/supabase/server";

export const PROVIDER_FAILED = "Couldn't sign you in with that account. Try again, or use your email.";

// Apple and Google have already checked the email, so the account counts as confirmed.
async function toTokens(session: Session): Promise<Tokens> {
  await markEmailVerified(session.user.id);
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  };
}

const BROWSER_PROVIDERS = ["google", "apple"];
// The app's own link scheme, plus the ones Expo uses while developing.
const APP_REDIRECTS = ["revlog://", "exp+revlog://", "exp://"];

// Where the phone's sign-in browser starts. Supabase sends it back to the app
// with a one-time code that only the phone's verifier can redeem.
export function oauthStartUrl(provider: string, redirectTo: string, codeChallenge: string) {
  if (!BROWSER_PROVIDERS.includes(provider)) return null;
  if (!APP_REDIRECTS.some((prefix) => redirectTo.startsWith(prefix))) return null;
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) return null;
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: "s256",
  });
  return `${supabaseUrl}/auth/v1/authorize?${params}`;
}

// The iPhone's own Sign in with Apple sheet hands back a signed identity token.
export async function signInWithAppleToken(idToken: string, nonce: string) {
  if (!idToken || !nonce) return null;
  const { data, error } = await createAuthClient().auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce,
  });
  if (error || !data.session) return null;
  return toTokens(data.session);
}

// Browser sign-in (Google, and Apple off iOS) ends with a one-time code. The
// phone made the verifier, so only it can redeem the code, and it does so here
// because the Supabase key stays on the server.
export async function redeemOAuthCode(code: string, codeVerifier: string) {
  if (!code || !codeVerifier) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  });
  if (!res.ok) return null;
  const session = (await res.json()) as Session;
  if (!session.access_token || !session.user) return null;
  return toTokens(session);
}
