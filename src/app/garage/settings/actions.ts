"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removeAccount } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { saveReminderSettings } from "@/lib/email-settings";
import { sendTestReminder } from "@/lib/email-test";
import { isEmailVerified, resendVerificationEmail } from "@/lib/email-verification";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string } | undefined;

export async function saveEmailSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const error = await saveReminderSettings(
    user.id,
    formData.get("reminderEmails") === "on",
    String(formData.get("reminderPercent") ?? ""),
  );
  if (error) return { error };
  revalidatePath("/garage", "layout");
  return { message: "Saved." };
}

export async function sendTestEmail(): Promise<SettingsState> {
  return sendTestReminder(await requireUser());
}

export async function resendConfirmation(): Promise<SettingsState> {
  const user = await requireUser();
  if (!user.email) return { error: "Your account has no email address." };
  if (await isEmailVerified(user.id)) return { message: "Your email is already confirmed." };

  const error = await resendVerificationEmail(user.id, user.email);
  if (error) return { error };
  return { message: `Sent to ${user.email}. Open the link in it to confirm (check spam too).` };
}

export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const error = await removeAccount(user.id, String(formData.get("confirm") ?? ""));
  if (error) return { error };

  // The user is gone on the server, so just clear this browser's session.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/");
}
