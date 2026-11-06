import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiConsents } from "@/db/schema";

export const AI_CONSENT_NEEDED =
  "Allow AI scanning to read this file. You can also fill it in by hand.";

export async function hasAiConsent(userId: string) {
  const [row] = await db
    .select({ userId: aiConsents.userId })
    .from(aiConsents)
    .where(eq(aiConsents.userId, userId));
  return Boolean(row);
}

export async function grantAiConsent(userId: string) {
  await db.insert(aiConsents).values({ userId }).onConflictDoNothing();
}

export async function withdrawAiConsent(userId: string) {
  await db.delete(aiConsents).where(eq(aiConsents.userId, userId));
}
