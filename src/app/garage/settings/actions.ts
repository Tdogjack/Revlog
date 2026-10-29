"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { setReminderEmails } from "@/lib/email-settings";
import { testEmail } from "@/lib/email-templates";
import { deleteAllPhotos } from "@/lib/photos";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string } | undefined;

export async function saveEmailSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  await setReminderEmails(user.id, formData.get("reminderEmails") === "on");
  revalidatePath("/garage/settings");
  return { message: "Saved." };
}

// Per-instance throttle; enough to stop accidental repeat clicks.
const lastTestSent = new Map<string, number>();

export async function sendTestEmail(): Promise<SettingsState> {
  const user = await requireUser();
  if (!user.email) return { error: "Your account has no email address." };
  if (!emailConfigured()) return { error: "Email sending isn't set up on this site yet." };

  const last = lastTestSent.get(user.id) ?? 0;
  if (Date.now() - last < 60_000) return { error: "Wait a minute before sending another." };
  lastTestSent.set(user.id, Date.now());

  const base = siteUrl();
  const result = await sendEmail({
    to: user.email,
    ...testEmail({ garageUrl: `${base}/garage`, settingsUrl: `${base}/garage/settings` }),
  });
  if (!result.ok) return { error: `Couldn't send: ${result.error}` };
  return { message: `Sent to ${user.email}. Check your inbox (and spam folder).` };
}

export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  try {
    await deleteAllPhotos(user.id);
  } catch {
    return { error: "Couldn't remove your car photos. Try again." };
  }
  // Every table references auth.users with ON DELETE CASCADE, so this removes
  // all of the user's cars, records, mods, reminders, parts, and settings.
  await db.execute(sql`delete from auth.users where id = ${user.id}`);

  // The user is gone on the server, so just clear this browser's session.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/");
}
