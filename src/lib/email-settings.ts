import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailSettings } from "@/db/schema";
import { isUuid } from "@/lib/vehicles";

export async function getEmailSettings(userId: string) {
  const [row] = await db.select().from(emailSettings).where(eq(emailSettings.userId, userId));
  return {
    reminderEmails: row?.reminderEmails ?? true,
    reminderPercent: row?.reminderPercent ?? null,
    pushReminders: row?.pushReminders ?? true,
  };
}

export async function setReminderPercent(userId: string, percent: number | null) {
  await db
    .insert(emailSettings)
    .values({ userId, reminderPercent: percent })
    .onConflictDoUpdate({
      target: emailSettings.userId,
      set: { reminderPercent: percent, updatedAt: new Date() },
    });
}

export async function setReminderEmails(userId: string, enabled: boolean) {
  await db
    .insert(emailSettings)
    .values({ userId, reminderEmails: enabled })
    .onConflictDoUpdate({
      target: emailSettings.userId,
      set: { reminderEmails: enabled, updatedAt: new Date() },
    });
}

export async function setPushReminders(userId: string, enabled: boolean) {
  await db
    .insert(emailSettings)
    .values({ userId, pushReminders: enabled })
    .onConflictDoUpdate({
      target: emailSettings.userId,
      set: { pushReminders: enabled, updatedAt: new Date() },
    });
}

// Saves both reminder settings. Returns what to fix, or null once saved.
export async function saveReminderSettings(userId: string, enabled: boolean, rawPercent: string) {
  const trimmed = rawPercent.trim();
  const percent = trimmed ? Number(trimmed) : null;
  if (percent != null && (!Number.isInteger(percent) || percent < 50 || percent > 99)) {
    return "Use a whole percent from 50 to 99, or leave it blank.";
  }
  await setReminderEmails(userId, enabled);
  await setReminderPercent(userId, percent);
  return null;
}

// Unsubscribe links carry the user id plus an HMAC of it, so they work
// without logging in but can't be forged for someone else.
function unsubscribeSignature(userId: string) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("Set CRON_SECRET to sign unsubscribe links.");
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

export function unsubscribeToken(userId: string) {
  return `${userId}.${unsubscribeSignature(userId)}`;
}

// Returns the user id the token belongs to, or null if it's not valid.
export function readUnsubscribeToken(token: string) {
  const [userId, signature] = token.split(".");
  if (!userId || !signature || !isUuid(userId)) return null;
  const given = Buffer.from(signature);
  const expected = Buffer.from(unsubscribeSignature(userId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}
