"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  registerAccount,
  signInWithPassword,
  USERNAME_TAKEN,
  usernameProblem,
} from "@/lib/account";
import { checkPassword } from "@/lib/password-rules";
import { createProfile } from "@/lib/profiles";
import { RESET_COOKIE } from "@/lib/reset-cookie";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/username-rules";

export type AuthState =
  { error?: string; message?: string; values?: Record<string, string> } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

// Only allow redirects back into the app, never to another site.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/garage";
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const values = { email, username };
  const result = await registerAccount(
    await createClient(),
    { email, password, username, agreed: formData.get("agree") === "on" },
    await siteOrigin(),
  );
  if ("error" in result) return { error: result.error, values };
  if (!result.session) {
    return { message: "Check your email for a link to confirm your account." };
  }
  redirect("/garage");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const result = await signInWithPassword(await createClient(), email, password);
  if ("error" in result) return { error: result.error };
  redirect(safeNext(formData.get("next")));
}

const OAUTH_PROVIDERS = ["google", "apple"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

// Sends the browser to Google or Apple. They come back to /auth/callback.
export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) redirect("/login");

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback`,
  });
  if (error?.status === 429) {
    return { error: "Too many reset emails were sent. Wait a few minutes and try again." };
  }

  (await cookies()).set(RESET_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  // Same message whether or not the email has an account.
  return {
    message:
      "If that email has a Revlog account, a reset link is on its way. Open it in this browser.",
  };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const weak = checkPassword(password);
  if (weak) return { error: weak };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Choose a password different from your current one." };
    }
    return { error: error.message };
  }
  return { message: "Your password is updated." };
}

// For accounts made before usernames existed (or whose pick was taken).
export async function chooseUsername(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const values = { username };
  const badName = usernameProblem(username);
  if (badName) return { error: badName, values };
  if (!(await createProfile(user.id, username))) return { error: USERNAME_TAKEN, values };
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  // Only this browser. The default would also sign the phone app out.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
