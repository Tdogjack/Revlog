import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mileageReadings, reminders, vehicles } from "@/db/schema";
import type { PlanItem } from "@/lib/service-plan";

// The database connection bypasses row-level security, so every query here
// must filter by the signed-in user's id.

const optionalText = z
  .string()
  .trim()
  .max(100)
  .transform((v) => v || null);

const wholeNumber = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[,\s]/g, "") : v),
    z.coerce
      .number({ message: `Enter a number for ${label}.` })
      .int(`Use a whole number for ${label}.`)
      .min(min, `${label[0].toUpperCase()}${label.slice(1)} looks too low.`)
      .max(max, `${label[0].toUpperCase()}${label.slice(1)} looks too high.`),
  );

export const vehicleInput = z.object({
  // Checked at submit time; reading the clock at module load breaks prerendering.
  year: wholeNumber("year", 1886, 9999).refine(
    (y) => y <= new Date().getFullYear() + 1,
    "Year looks too high.",
  ),
  make: z.string().trim().min(1, "Enter the make, like Honda.").max(50),
  model: z.string().trim().min(1, "Enter the model, like Civic.").max(50),
  trim: optionalText,
  nickname: optionalText,
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-HJ-NPR-Z0-9]{17}$/.test(v), "A VIN is 17 letters and numbers.")
    .transform((v) => v || null),
  currentMileage: wholeNumber("mileage", 0, 2_000_000),
  builtOn: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{4}-(0[1-9]|1[0-2])-01$/.test(v),
      "Pick both the month and the 4-digit year it was built.",
    )
    .refine((v) => v === "" || v >= "1886-01-01", "Build year looks too low.")
    .refine(
      (v) => v === "" || v <= new Date().toISOString().slice(0, 10),
      "Build date can't be in the future.",
    )
    .transform((v) => v || null),
});

export type VehicleInput = z.infer<typeof vehicleInput>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids come from the URL; anything that isn't a uuid would make Postgres error.
export const isUuid = (id: string) => uuidPattern.test(id);

export function listVehicles(userId: string) {
  return (
    db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId))
      // Favorites first, then the user's order; cars added since sit at the top.
      .orderBy(
        desc(vehicles.favorite),
        sql`${vehicles.position} asc nulls first`,
        desc(vehicles.createdAt),
      )
  );
}

export async function setVehicleFavorite(userId: string, id: string, favorite: boolean) {
  if (!uuidPattern.test(id)) return;
  await db
    .update(vehicles)
    .set({ favorite })
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)));
}

// Swaps a car with its neighbor in the list as shown. Favorites and the rest
// are reordered separately, so a car never jumps across that line.
export async function moveVehicle(userId: string, id: string, direction: "up" | "down") {
  const cars = await listVehicles(userId);
  const index = cars.findIndex((c) => c.id === id);
  if (index === -1) return;
  const target = direction === "up" ? index - 1 : index + 1;
  const neighbor = cars[target];
  if (!neighbor || neighbor.favorite !== cars[index].favorite) return;

  const order = cars.map((c) => c.id);
  [order[index], order[target]] = [order[target], order[index]];
  await db.transaction(async (tx) => {
    for (const [position, carId] of order.entries()) {
      await tx
        .update(vehicles)
        .set({ position })
        .where(and(eq(vehicles.id, carId), eq(vehicles.userId, userId)));
    }
  });
}

export async function getVehicle(userId: string, id: string) {
  if (!uuidPattern.test(id)) return null;
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
    .limit(1);
  return vehicle ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const utcToday = () => new Date().toISOString().slice(0, 10);

// Saves the odometer for the graph; a second reading on the same day replaces the first.
function recordReading(tx: Tx, userId: string, vehicleId: string, mileage: number, readOn: string) {
  return tx
    .insert(mileageReadings)
    .values({ userId, vehicleId, mileage, readOn })
    .onConflictDoUpdate({
      target: [mileageReadings.vehicleId, mileageReadings.readOn],
      set: { mileage },
    });
}

// Starter reminders stay "unknown" until the owner logs the service or says it's
// never been done, since assuming either would misreport a used car.
export async function createVehicle(userId: string, input: VehicleInput, plan: PlanItem[] = []) {
  return db.transaction(async (tx) => {
    const [vehicle] = await tx
      .insert(vehicles)
      .values({ ...input, userId })
      .returning({ id: vehicles.id });
    await recordReading(tx, userId, vehicle.id, input.currentMileage, utcToday());
    if (plan.length > 0) {
      const now = Date.now();
      await tx.insert(reminders).values(
        plan.map((item, i) => ({
          userId,
          vehicleId: vehicle.id,
          task: item.task,
          serviceCategory: item.service,
          intervalMiles: item.intervalMiles,
          intervalMonths: item.intervalMonths,
          lastDoneOn: null,
          lastDoneMileage: 0,
          startedOn: utcToday(),
          // Reminders list oldest first, so this keeps them in plan order.
          createdAt: new Date(now + i),
        })),
      );
    }
    return vehicle;
  });
}

export async function updateVehicle(userId: string, id: string, input: VehicleInput) {
  if (!uuidPattern.test(id)) return false;
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ currentMileage: vehicles.currentMileage })
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
      .limit(1);
    if (!before) return false;
    await tx
      .update(vehicles)
      .set(input)
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)));
    if (before.currentMileage !== input.currentMileage) {
      await recordReading(tx, userId, id, input.currentMileage, utcToday());
    }
    return true;
  });
}

export const mileageInput = wholeNumber("mileage", 0, 2_000_000);

// `readOn` is the owner's local date when the browser sends one.
export async function setVehicleMileage(
  userId: string,
  id: string,
  currentMileage: number,
  readOn = utcToday(),
) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(vehicles)
      .set({ currentMileage })
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
      .returning({ id: vehicles.id });
    if (updated.length > 0) await recordReading(tx, userId, id, currentMileage, readOn);
  });
}

export function listMileageReadings(userId: string, vehicleId?: string) {
  return db
    .select({
      vehicleId: mileageReadings.vehicleId,
      readOn: mileageReadings.readOn,
      mileage: mileageReadings.mileage,
    })
    .from(mileageReadings)
    .where(
      vehicleId
        ? and(eq(mileageReadings.userId, userId), eq(mileageReadings.vehicleId, vehicleId))
        : eq(mileageReadings.userId, userId),
    );
}

// Returns the previous photo path so the caller can delete the old file.
export async function setVehiclePhoto(userId: string, id: string, photoPath: string | null) {
  const [existing] = await db
    .select({ photoPath: vehicles.photoPath })
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
    .limit(1);
  if (!existing) return undefined;

  await db
    .update(vehicles)
    .set({ photoPath })
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)));
  return existing.photoPath;
}

export function vehicleName(v: { year: number; make: string; model: string; trim: string | null }) {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}
