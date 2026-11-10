import "server-only";
import { sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { checkPassword } from "@/lib/password-rules";
import { deleteAllPhotos } from "@/lib/photos";
import { createProfile, usernameTaken } from "@/lib/profiles";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { hasBlockedWords } from "@/lib/text-filter";
import { checkUsername, normalizeUsername } from "@/lib/username-rules";

const EMAIL_TAKEN = "An account with that email already exists. Log in instead.";
export const USERNAME_TAKEN = "That username is taken. Try another.";

const offensiveName = (username: string) =>
  hasBlockedWords(username) ? "That username isn't allowed. Try another." : null;

export const usernameProblem = (username: string) =>
  checkUsername(username) ?? offensiveName(username);

type Auth = Pick<SupabaseClient, "auth">;

// Shared by the sign-up form and the phone app, so every rule applies to both.
export async function registerAccount(
  supabase: Auth,
  input: { email: string; password: string; username: string; agreed: boolean },
  redirectBase: string,
) {
  const { email, password, agreed } = input;
  const username = normalizeUsername(input.username);
  if (!email || !password || !username) {
    return { error: "Enter a username, your email, and a password." };
  }
  const badName = usernameProblem(username);
  if (badName) return { error: badName };
  if (!agreed) return { error: "Agree to the Terms and Privacy Policy to create an account." };
  const weak = checkPassword(password);
  if (weak) return { error: weak };
  if (await usernameTaken(username)) return { error: USERNAME_TAKEN };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectBase}/auth/callback`,
      data: { terms_accepted_at: new Date().toISOString() },
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: EMAIL_TAKEN };
    return { error: error.message };
  }

  // With email confirmation on, Supabase doesn't error for a taken email; it
  // returns a placeholder user with no identities instead.
  if (!data.user || data.user.identities?.length === 0) return { error: EMAIL_TAKEN };

  // If someone grabbed the name in the meantime, the account still works and
  // the garage asks for a new username on first visit.
  await createProfile(data.user.id, username);

  // With email confirmation on in Supabase, there's no session until the link
  // is clicked. Otherwise the account works now, and confirming the email
  // unlocks photos and scans.
  if (data.session) await sendVerificationEmail(email);
  return { session: data.session };
}

export async function signInWithPassword(supabase: Auth, email: string, password: string) {
  if (!email || !password) return { error: "Enter your email and password." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email first. Check your inbox for the link." };
    }
    return { error: "That email and password don't match. Try again." };
  }
  return { session: data.session };
}

// Returns an error message, or null once the account is gone.
export async function removeAccount(userId: string, typed: string) {
  if (typed.trim() !== "DELETE") return "Type DELETE to confirm.";
  try {
    await deleteAllPhotos(userId);
  } catch {
    return "Couldn't remove your photos. Try again.";
  }
  // Every table references auth.users with ON DELETE CASCADE, so this removes
  // all of the user's cars, records, mods, reminders, parts, and settings.
  await db.execute(sql`delete from auth.users where id = ${userId}`);
  return null;
}

// For the phone app, which holds a token rather than a session cookie. Asks the
// auth service directly, as that token's owner. Returns an error message, or
// null once the password is changed.
export async function changePassword(token: string, password: string, confirm: string) {
  const weak = checkPassword(password);
  if (weak) return weak;
  if (password !== confirm) return "The two passwords don't match.";

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (res.ok) return null;
  const data = (await res.json().catch(() => null)) as { error_code?: string } | null;
  if (data?.error_code === "same_password") {
    return "Choose a password different from your current one.";
  }
  if (data?.error_code === "weak_password") return "Choose a stronger password.";
  if (res.status === 401 || res.status === 403) return "Your session ended. Sign in again.";
  return "Your password wasn't changed. Try again.";
}
