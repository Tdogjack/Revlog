import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partPrices, parts, serviceRecords, vehicles } from "@/db/schema";
import type { PartInput } from "@/lib/parts";
import { isUuid } from "@/lib/vehicles";

const stripNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v);
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

// `category` is a service type key, already resolved by resolveServiceType.
// A blank title falls back to the type's name, which the caller supplies.
export const serviceRecordInput = z
  .object({
    category: z.string().min(1, "Pick what kind of service this was."),
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
    title: r.title,
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

// Just what reminders need, across all of a user's cars.
export function listServiceDates(userId: string) {
  return db
    .select({
      id: serviceRecords.id,
      title: serviceRecords.title,
      vehicleId: serviceRecords.vehicleId,
      category: serviceRecords.category,
      servicedOn: serviceRecords.servicedOn,
      mileage: serviceRecords.mileage,
    })
    .from(serviceRecords)
    .where(eq(serviceRecords.userId, userId));
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

// Saves a batch of past records in one go: all of them or none. Odometer
// moves up to the highest reading in the batch, and a record with no cost
// takes its parts total, like a logged record does. Returns the new ids in
// the order given.
export async function createServiceRecords(
  userId: string,
  vehicleId: string,
  rows: { record: ServiceRecordInput; parts: PartInput[] }[],
) {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!owned) return null;

    const prepared = rows.map(({ record, parts: partRows }) => {
      const partsTotal = partRows.reduce((sum, p) => sum + Number(p.price ?? 0) * p.quantity, 0);
      return {
        id: randomUUID(),
        cost: record.cost ?? (partsTotal > 0 ? partsTotal.toFixed(2) : null),
        record,
        partRows,
      };
    });

    await tx.insert(serviceRecords).values(
      prepared.map(({ id, cost, record }) => ({ ...record, cost, id, userId, vehicleId })),
    );

    const newParts = prepared.flatMap(({ id, partRows }) =>
      partRows.map((p) => ({ ...p, id: randomUUID(), serviceRecordId: id, userId, vehicleId })),
    );
    if (newParts.length > 0) {
      await tx.insert(parts).values(newParts);
      const priced = newParts.flatMap((p) =>
        p.price == null ? [] : [{ userId, partId: p.id, price: p.price }],
      );
      if (priced.length > 0) await tx.insert(partPrices).values(priced);
    }

    const mileages = rows.flatMap((r) => (r.record.mileage == null ? [] : [r.record.mileage]));
    if (mileages.length > 0) {
      const highest = Math.max(...mileages);
      await tx
        .update(vehicles)
        .set({ currentMileage: highest })
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.userId, userId),
            lt(vehicles.currentMileage, highest),
          ),
        );
    }

    return prepared.map((p) => p.id);
  });
}

export async function getServiceRecord(userId: string, vehicleId: string, recordId: string) {
  if (!isUuid(recordId)) return null;
  const [record] = await db
    .select()
    .from(serviceRecords)
    .where(
      and(
        eq(serviceRecords.id, recordId),
        eq(serviceRecords.vehicleId, vehicleId),
        eq(serviceRecords.userId, userId),
      ),
    )
    .limit(1);
  return record ?? null;
}

// Updates a record; like creating one, a higher mileage advances the car's odometer.
export async function updateServiceRecord(
  userId: string,
  vehicleId: string,
  recordId: string,
  input: ServiceRecordInput,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(serviceRecords)
      .set(input)
      .where(
        and(
          eq(serviceRecords.id, recordId),
          eq(serviceRecords.vehicleId, vehicleId),
          eq(serviceRecords.userId, userId),
        ),
      )
      .returning({ id: serviceRecords.id });
    if (!updated) return null;

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
    return updated;
  });
}

export async function deleteServiceRecord(userId: string, recordId: string) {
  await db
    .delete(serviceRecords)
    .where(and(eq(serviceRecords.id, recordId), eq(serviceRecords.userId, userId)));
}
