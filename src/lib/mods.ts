import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mods, vehicles } from "@/db/schema";
import { MOD_CATEGORIES, MOD_STATUSES, type ModStatus } from "@/lib/mod-categories";
import { isUuid } from "@/lib/vehicles";

const categoryValues = MOD_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const statusValues = MOD_STATUSES.map((s) => s.value) as [ModStatus, ...ModStatus[]];

const stripNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v);
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const modStatusInput = z.enum(statusValues);

export const modInput = z
  .object({
    part: z.string().trim().min(1, "Enter the part, like Cold air intake.").max(100),
    brand: z.string().trim().max(60),
    category: z.enum(categoryValues, { message: "Pick a category." }),
    status: z.enum(statusValues, { message: "Pick a status." }),
    cost: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter cost as a number, like 349.99." })
        .min(0, "Cost can't be negative.")
        .max(1_000_000, "Cost looks too high.")
        .optional(),
    ),
    installedOn: z
      .string()
      .refine(
        (d) => d === "" || (/^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))),
        "Pick a valid install date.",
      ),
    installedMileage: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter mileage as a number." })
        .int("Use a whole number for mileage.")
        .min(0)
        .max(2_000_000, "Mileage looks too high.")
        .optional(),
    ),
    notes: z.string().trim().max(2000),
  })
  .transform((m) => ({
    part: m.part,
    brand: m.brand || null,
    category: m.category,
    status: m.status,
    cost: m.cost == null ? null : m.cost.toFixed(2),
    // Planned mods don't have install details yet.
    installedOn: m.status === "planned" ? null : m.installedOn || null,
    installedMileage: m.status === "planned" ? null : (m.installedMileage ?? null),
    notes: m.notes || null,
  }));

export type ModInput = z.infer<typeof modInput>;

// Installed first, then planned, then removed; newest within each group.
export function listMods(userId: string, vehicleId: string) {
  return db
    .select()
    .from(mods)
    .where(and(eq(mods.vehicleId, vehicleId), eq(mods.userId, userId)))
    .orderBy(
      asc(sql`case ${mods.status} when 'installed' then 0 when 'planned' then 1 else 2 end`),
      desc(mods.installedOn),
      desc(mods.createdAt),
    );
}

export async function createMod(userId: string, vehicleId: string, input: ModInput) {
  const [owned] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
    .limit(1);
  if (!owned) return null;

  const [mod] = await db
    .insert(mods)
    .values({ ...input, userId, vehicleId })
    .returning({ id: mods.id });
  return mod;
}

export async function getMod(userId: string, vehicleId: string, modId: string) {
  if (!isUuid(modId)) return null;
  const [mod] = await db
    .select()
    .from(mods)
    .where(and(eq(mods.id, modId), eq(mods.vehicleId, vehicleId), eq(mods.userId, userId)))
    .limit(1);
  return mod ?? null;
}

export async function updateMod(userId: string, vehicleId: string, modId: string, input: ModInput) {
  const [updated] = await db
    .update(mods)
    .set(input)
    .where(and(eq(mods.id, modId), eq(mods.vehicleId, vehicleId), eq(mods.userId, userId)))
    .returning({ id: mods.id });
  return updated ?? null;
}

export async function setModStatus(userId: string, modId: string, status: ModStatus) {
  await db
    .update(mods)
    .set({ status })
    .where(and(eq(mods.id, modId), eq(mods.userId, userId)));
}

export async function deleteMod(userId: string, modId: string) {
  await db.delete(mods).where(and(eq(mods.id, modId), eq(mods.userId, userId)));
}
