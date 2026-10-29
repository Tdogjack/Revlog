import "server-only";
import { and, asc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mods, partPrices, parts, serviceRecords, type Part } from "@/db/schema";
import { fetchPagePrice, PriceCheckError, validatePartUrl } from "@/lib/price-fetch";
import { isUuid } from "@/lib/vehicles";

const stripNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v);
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const partInput = z
  .object({
    name: z.string().trim().min(1, "Name the part, like Oil filter.").max(120),
    url: z
      .string()
      .trim()
      .max(2000)
      .transform((u, ctx) => {
        if (!u) return null;
        const withScheme = /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`;
        try {
          return validatePartUrl(withScheme).toString();
        } catch (err) {
          ctx.addIssue({ code: "custom", message: (err as Error).message });
          return z.NEVER;
        }
      }),
    quantity: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter quantity as a number." })
        .int("Use a whole number for quantity.")
        .min(1, "Quantity must be at least 1.")
        .max(999)
        .default(1),
    ),
    price: z.preprocess(
      (v) => blankToUndefined(stripNumber(v)),
      z.coerce
        .number({ message: "Enter price as a number, like 24.99." })
        .min(0, "Price can't be negative.")
        .max(1_000_000, "Price looks too high.")
        .optional(),
    ),
    trackPrice: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((p) => !p.trackPrice || p.url, {
    message: "Add a link to track this part's price.",
  })
  .transform((p) => ({
    name: p.name,
    url: p.url,
    quantity: p.quantity,
    price: p.price == null ? null : p.price.toFixed(2),
    trackPrice: p.trackPrice,
  }));

export type PartInput = z.infer<typeof partInput>;
export type PartParent = { modId: string } | { serviceRecordId: string };

export type PartWithHistory = Part & {
  firstPrice: number | null;
  lowestPrice: number | null;
  previousPrice: number | null;
};

// All parts on a car, with a short price history summary for each.
export async function listPartsForVehicle(userId: string, vehicleId: string) {
  const rows = await db
    .select()
    .from(parts)
    .where(and(eq(parts.vehicleId, vehicleId), eq(parts.userId, userId)))
    .orderBy(asc(parts.createdAt));
  if (rows.length === 0) return [];

  const history = await db
    .select({ partId: partPrices.partId, price: partPrices.price })
    .from(partPrices)
    .where(
      and(
        eq(partPrices.userId, userId),
        inArray(
          partPrices.partId,
          rows.map((r) => r.id),
        ),
      ),
    )
    .orderBy(asc(partPrices.createdAt));

  return rows.map((part): PartWithHistory => {
    const prices = history.filter((h) => h.partId === part.id).map((h) => Number(h.price));
    return {
      ...part,
      firstPrice: prices[0] ?? null,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      previousPrice: prices.length >= 2 ? prices[prices.length - 2] : null,
    };
  });
}

async function ownsParent(userId: string, vehicleId: string, parent: PartParent) {
  if ("modId" in parent) {
    if (!isUuid(parent.modId)) return false;
    const [row] = await db
      .select({ id: mods.id })
      .from(mods)
      .where(and(eq(mods.id, parent.modId), eq(mods.vehicleId, vehicleId), eq(mods.userId, userId)))
      .limit(1);
    return !!row;
  }
  if (!isUuid(parent.serviceRecordId)) return false;
  const [row] = await db
    .select({ id: serviceRecords.id })
    .from(serviceRecords)
    .where(
      and(
        eq(serviceRecords.id, parent.serviceRecordId),
        eq(serviceRecords.vehicleId, vehicleId),
        eq(serviceRecords.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function createPart(
  userId: string,
  vehicleId: string,
  parent: PartParent,
  input: PartInput,
) {
  if (!(await ownsParent(userId, vehicleId, parent))) return null;
  const [part] = await db
    .insert(parts)
    .values({ ...input, ...parent, userId, vehicleId })
    .returning();
  if (input.price != null) {
    await db.insert(partPrices).values({ userId, partId: part.id, price: input.price });
  }
  return part;
}

export async function getPart(userId: string, partId: string) {
  if (!isUuid(partId)) return null;
  const [part] = await db
    .select()
    .from(parts)
    .where(and(eq(parts.id, partId), eq(parts.userId, userId)))
    .limit(1);
  return part ?? null;
}

export async function updatePart(userId: string, partId: string, input: PartInput) {
  const existing = await getPart(userId, partId);
  if (!existing) return null;
  const [part] = await db
    .update(parts)
    .set({
      ...input,
      // A new link starts fresh; clear the old link's check status.
      ...(input.url !== existing.url ? { lastCheckedAt: null, lastCheckError: null } : {}),
    })
    .where(and(eq(parts.id, partId), eq(parts.userId, userId)))
    .returning();
  if (input.price != null && input.price !== existing.price) {
    await db.insert(partPrices).values({ userId, partId, price: input.price });
  }
  return part;
}

export async function deletePart(userId: string, partId: string) {
  await db.delete(parts).where(and(eq(parts.id, partId), eq(parts.userId, userId)));
}

// Reads the current price from the part's link and records it if it changed.
// Returns an error message for the UI instead of throwing.
export async function checkPartPrice(part: Part): Promise<string | null> {
  if (!part.url) return "Add a link to check this part's price.";
  const checkedAt = new Date();
  try {
    const found = await fetchPagePrice(part.url);
    const price = found.price.toFixed(2);
    await db
      .update(parts)
      .set({
        price,
        currency: found.currency ?? part.currency,
        lastCheckedAt: checkedAt,
        lastCheckError: null,
      })
      .where(eq(parts.id, part.id));
    if (price !== part.price) {
      await db
        .insert(partPrices)
        .values({ userId: part.userId, partId: part.id, price, currency: found.currency });
    }
    return null;
  } catch (err) {
    const message =
      err instanceof PriceCheckError ? err.message : "Something went wrong checking the price.";
    await db
      .update(parts)
      .set({ lastCheckedAt: checkedAt, lastCheckError: message })
      .where(eq(parts.id, part.id));
    return message;
  }
}

// Tracked parts not checked in the last ~20 hours, oldest first.
export function partsDueForCheck(limit: number) {
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  return db
    .select()
    .from(parts)
    .where(
      and(
        eq(parts.trackPrice, true),
        or(isNull(parts.lastCheckedAt), lt(parts.lastCheckedAt, cutoff)),
      ),
    )
    .orderBy(asc(parts.lastCheckedAt))
    .limit(limit);
}
