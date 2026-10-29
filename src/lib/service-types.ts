import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { serviceTypes } from "@/db/schema";
import { isBuiltInType, NEW_TYPE, SERVICE_CATEGORIES } from "@/lib/service-categories";

export function listServiceTypes(userId: string) {
  return db
    .select({ id: serviceTypes.id, name: serviceTypes.name })
    .from(serviceTypes)
    .where(eq(serviceTypes.userId, userId))
    .orderBy(asc(serviceTypes.name));
}

// Turns the form's type choice into a type key, creating a custom type if
// the user typed a new name. Reuses an existing type with the same name.
export async function resolveServiceType(
  userId: string,
  choice: string,
  newName: string,
): Promise<{ key: string } | { error: string }> {
  if (choice !== NEW_TYPE) {
    if (isBuiltInType(choice)) return { key: choice };
    const types = await listServiceTypes(userId);
    if (types.some((t) => t.id === choice)) return { key: choice };
    return { error: "Pick a service type." };
  }

  const name = newName.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Name your new service type." };
  if (name.length > 60) return { error: "Keep the service type name under 60 characters." };

  const builtIn = SERVICE_CATEGORIES.find((c) => c.label.toLowerCase() === name.toLowerCase());
  if (builtIn) return { key: builtIn.value };

  const [existing] = await db
    .select({ id: serviceTypes.id })
    .from(serviceTypes)
    .where(and(eq(serviceTypes.userId, userId), sql`lower(${serviceTypes.name}) = lower(${name})`))
    .limit(1);
  if (existing) return { key: existing.id };

  const [created] = await db
    .insert(serviceTypes)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning({ id: serviceTypes.id });
  if (created) return { key: created.id };

  // Lost a race with a duplicate insert; look it up again.
  const [again] = await db
    .select({ id: serviceTypes.id })
    .from(serviceTypes)
    .where(and(eq(serviceTypes.userId, userId), sql`lower(${serviceTypes.name}) = lower(${name})`))
    .limit(1);
  return again ? { key: again.id } : { error: "That service type couldn't be saved. Try again." };
}
