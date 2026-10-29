"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword } from "@/lib/password-rules";
import { RESET_COOKIE } from "@/lib/reset-cookie";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

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

const EMAIL_TAKEN = "An account with that email already exists. Log in instead.";

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and a password." };
  const weak = checkPassword(password);
  if (weak) return { error: weak };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: EMAIL_TAKEN };
    return { error: error.message };
  }

  // With email confirmation on, Supabase doesn't error for a taken email; it
  // returns a placeholder user with no identities instead.
  if (data.user && data.user.identities?.length === 0) return { error: EMAIL_TAKEN };

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) {
    return { message: "Check your email for a link to confirm your account." };
  }
  redirect("/garage");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email first. Check your inbox for the link." };
    }
    return { error: "That email and password don't match. Try again." };
  }

  redirect(safeNext(formData.get("next")));
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
