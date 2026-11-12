import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";
import { claimAction } from "@/lib/rate-limit";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo takes at most 100 messages per request.
const BATCH_SIZE = 100;
const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[\w-]+\]$/;
const PLATFORMS = new Set(["ios", "android"]);

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  // Read by the app when the notification is tapped.
  data?: Record<string, string>;
};

type Ticket = { status: "ok" } | { status: "error"; message?: string; details?: { error?: string } };

// Saves this phone's token for the user. Returns what to fix, or null once saved.
export async function registerPushToken(userId: string, token: unknown, platform: unknown) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    return "That push token isn't valid.";
  }
  if (typeof platform !== "string" || !PLATFORMS.has(platform)) {
    return "Platform must be ios or android.";
  }
  await db
    .insert(pushTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId, platform, updatedAt: new Date() },
    });
  return null;
}

export async function removePushToken(userId: string, token: unknown) {
  if (typeof token !== "string") return;
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

export async function pushTokensFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({ userId: pushTokens.userId, token: pushTokens.token })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, userIds));
  const byUser = new Map<string, string[]>();
  for (const { userId, token } of rows) byUser.set(userId, [...(byUser.get(userId) ?? []), token]);
  return byUser;
}

// Sends through Expo's push service. Tokens Apple or Google say are gone
// (the app was deleted) are removed. Returns the tokens that were accepted.
export async function sendPush(messages: PushMessage[]) {
  const accepted = new Set<string>();
  const gone: string[] = [];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch.map((m) => ({ ...m, sound: "default" }))),
      });
      if (!response.ok) {
        console.error("Push send failed", response.status, await response.text());
        continue;
      }
      const { data } = (await response.json()) as { data: Ticket[] };
      data.forEach((ticket, index) => {
        const token = batch[index].to;
        if (ticket.status === "ok") accepted.add(token);
        else if (ticket.details?.error === "DeviceNotRegistered") gone.push(token);
        else console.error("Push rejected", ticket.message);
      });
    } catch (err) {
      console.error("Push send failed", err);
    }
  }

  if (gone.length > 0) await db.delete(pushTokens).where(inArray(pushTokens.token, gone));
  return accepted;
}

// Sends a sample reminder to every phone the account is signed in on.
export async function sendTestPush(userId: string): Promise<{ error: string } | { message: string }> {
  const tokens = (await pushTokensFor([userId])).get(userId) ?? [];
  if (tokens.length === 0) {
    return { error: "Turn on notifications for Revlog on this phone first." };
  }
  if (!(await claimAction(userId, "test-push"))) {
    return { error: "You've sent several test notifications today. Try again tomorrow." };
  }
  const accepted = await sendPush(
    tokens.map((to) => ({
      to,
      title: "Revlog reminders are on",
      body: "This is how you'll hear when a service is due.",
    })),
  );
  if (accepted.size === 0) return { error: "Couldn't send the notification. Try again later." };
  return { message: "Sent. It should arrive in a few seconds." };
}
