import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { serviceRecords, vehicles } from "@/db/schema";
import { categoryLabel, SERVICE_CATEGORIES } from "@/lib/service-categories";

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const stripNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v);
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const serviceRecordInput = z
  .object({
    category: z.enum(categoryValues, { message: "Pick what kind of service this was." }),
    title: z.string().trim().max(100),
    servicedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date it was done.")
      .refine((d) => !Number.isNaN(Date.parse(d)), "Pick the date it was done."),
    mileage: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter mileage as a number." })
        .int("Use a whole number for mileage.")
        .min(0)
        .max(2_000_000, "Mileage looks too high.")
        .optional(),
    ),
    cost: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter cost as a number, like 89.99." })
        .min(0, "Cost can't be negative.")
        .max(1_000_000, "Cost looks too high.")
        .optional(),
    ),
    shop: z.string().trim().max(100),
    notes: z.string().trim().max(2000),
  })
  .transform((r) => ({
    category: r.category,
    title: r.title || categoryLabel(r.category),
    servicedOn: r.servicedOn,
    mileage: r.mileage ?? null,
    cost: r.cost == null ? null : r.cost.toFixed(2),
    shop: r.shop || null,
    notes: r.notes || null,
  }));

export type ServiceRecordInput = z.infer<typeof serviceRecordInput>;

export function listServiceRecords(userId: string, vehicleId: string) {
  return db
    .select()
    .from(serviceRecords)
    .where(and(eq(serviceRecords.vehicleId, vehicleId), eq(serviceRecords.userId, userId)))
    .orderBy(desc(serviceRecords.servicedOn), desc(serviceRecords.createdAt));
}

// Saves the record and bumps the car's odometer if this record is newer.
export async function createServiceRecord(
  userId: string,
  vehicleId: string,
  input: ServiceRecordInput,
) {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!owned) return null;

    const [record] = await tx
      .insert(serviceRecords)
      .values({ ...input, userId, vehicleId })
      .returning({ id: serviceRecords.id });

    if (input.mileage != null) {
      await tx
        .update(vehicles)
        .set({ currentMileage: input.mileage })
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.userId, userId),
            lt(vehicles.currentMileage, input.mileage),
          ),
        );
    }
    return record;
  });
}

export async function deleteServiceRecord(userId: string, recordId: string) {
  await db
    .delete(serviceRecords)
    .where(and(eq(serviceRecords.id, recordId), eq(serviceRecords.userId, userId)));
}
