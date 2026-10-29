import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function getProfile(userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? null;
}

export async function getProfileByUsername(username: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.username, username));
  return row ?? null;
}

export async function usernameTaken(username: string) {
  return (await getProfileByUsername(username)) !== null;
}

// Returns false if someone else claimed the username first.
export async function createProfile(userId: string, username: string) {
  const rows = await db
    .insert(profiles)
    .values({ userId, username })
    .onConflictDoNothing()
    .returning({ userId: profiles.userId });
  return rows.length > 0;
}
