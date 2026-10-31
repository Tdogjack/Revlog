import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reminders, vehicles } from "@/db/schema";
import { isUuid } from "@/lib/vehicles";

const stripNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[,\s]/g, "") : v);
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);
const isoDate = z
  .string()
  .refine(
    (d) => d === "" || (/^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))),
    "Pick a valid date.",
  );

const optionalWhole = (label: string, max: number) =>
  z.preprocess(
    (v) => blankToUndefined(stripNumber(v)),
    z.coerce
      .number({ message: `Enter ${label} as a number.` })
      .int(`Use a whole number for ${label}.`)
      .min(0)
      .max(max, `${label[0].toUpperCase()}${label.slice(1)} looks too high.`)
      .optional(),
  );

// The service type is resolved separately (it may create a custom type).
export const reminderInput = z
  .object({
    task: z.string().trim().max(100),
    intervalMiles: optionalWhole("miles", 200_000),
    intervalMonths: optionalWhole("months", 240),
    lastDoneOn: isoDate,
    lastDoneMileage: optionalWhole("mileage", 2_000_000),
    today: isoDate,
  })
  .refine((r) => r.intervalMiles || r.intervalMonths, {
    message: "Set a mileage interval, a time interval, or both.",
  })
  .transform((r) => ({
    task: r.task,
    intervalMiles: r.intervalMiles || null,
    intervalMonths: r.intervalMonths || null,
    lastDoneOn: r.lastDoneOn || null,
    lastDoneMileage: r.lastDoneMileage ?? null,
    today: r.today || null,
  }));

export type ReminderInputData = z.infer<typeof reminderInput>;

export function listReminders(userId: string, vehicleId: string) {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.vehicleId, vehicleId), eq(reminders.userId, userId)))
    .orderBy(asc(reminders.createdAt));
}

export function listAllReminders(userId: string) {
  return db.select().from(reminders).where(eq(reminders.userId, userId));
}

export async function getReminder(userId: string, vehicleId: string, reminderId: string) {
  if (!isUuid(reminderId)) return null;
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.vehicleId, vehicleId),
        eq(reminders.userId, userId),
      ),
    )
    .limit(1);
  return reminder ?? null;
}

// The stored last-done values are only a starting point; once a matching
// service record exists, the reminder counts from that instead.
export async function createReminder(
  userId: string,
  vehicleId: string,
  input: {
    task: string;
    serviceCategory: string;
    intervalMiles: number | null;
    intervalMonths: number | null;
  },
) {
  const [car] = await db
    .select({ currentMileage: vehicles.currentMileage })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
    .limit(1);
  if (!car) return null;

  const [reminder] = await db
    .insert(reminders)
    .values({
      userId,
      vehicleId,
      task: input.task,
      serviceCategory: input.serviceCategory,
      intervalMiles: input.intervalMiles,
      intervalMonths: input.intervalMonths,
      // Until a service of this type is logged, it counts as never done, from 0 mi.
      lastDoneOn: null,
      lastDoneMileage: 0,
    })
    .returning({ id: reminders.id });
  return reminder;
}

export async function updateReminder(
  userId: string,
  vehicleId: string,
  reminderId: string,
  input: {
    task: string;
    serviceCategory: string;
    intervalMiles: number | null;
    intervalMonths: number | null;
  },
) {
  const [updated] = await db
    .update(reminders)
    .set({ ...input, lastNotifiedAt: null })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.vehicleId, vehicleId),
        eq(reminders.userId, userId),
      ),
    )
    .returning({ id: reminders.id });
  return updated ?? null;
}

// Only for older reminders that aren't linked to a service type.
export async function setReminderStart(
  userId: string,
  reminderId: string,
  doneOn: string,
  mileage: number,
) {
  await db
    .update(reminders)
    .set({ lastDoneOn: doneOn, lastDoneMileage: mileage, lastNotifiedAt: null })
    .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}

export async function deleteReminder(userId: string, reminderId: string) {
  await db.delete(reminders).where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}
