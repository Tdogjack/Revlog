"use server";

import { readUnsubscribeToken, setReminderEmails } from "@/lib/email-settings";

export type UnsubscribeState = { done?: boolean; error?: string } | undefined;

export async function unsubscribe(token: string): Promise<UnsubscribeState> {
  const userId = readUnsubscribeToken(token);
  if (!userId)
    return {
      error: "This unsubscribe link isn't valid. Turn emails off in your settings instead.",
    };
  await setReminderEmails(userId, false);
  return { done: true };
}
