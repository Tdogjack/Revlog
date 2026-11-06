import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

const NO_SESSION = { persistSession: false, autoRefreshToken: false };

// The phone app sends its access token here instead of a session cookie.
export async function bearerToken() {
  const header = (await headers()).get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

// Signs in, signs up, and refreshes for the phone app. Holds no session, so
// nothing is left behind between requests.
export function createAuthClient() {
  return createPlainClient(supabaseUrl, supabaseKey, { auth: NO_SESSION });
}

// Runs as the signed-in user, from the phone app's token or the website's
// session cookie, so storage rules apply the same way to both.
export async function createClient() {
  const token = await bearerToken();
  if (token) {
    return createPlainClient(supabaseUrl, supabaseKey, {
      auth: NO_SESSION,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which can't set cookies.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}
