import "server-only";
import { and, asc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { mods, partPrices, parts, serviceRecords, type Part } from "@/db/schema";
import { fetchPagePrice, PriceCheckError, validatePartUrl } from "@/lib/price-fetch";
import type { PartRow } from "@/lib/part-rows";
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

// Reads the JSON list of part rows the forms send, skipping blank rows.
export function parsePartRows(
  json: string,
): { rows: (PartInput & { id?: string })[] } | { error: string } {
  let raw: unknown;
  try {
    raw = json ? JSON.parse(json) : [];
  } catch {
    return { error: "The parts list couldn't be read. Try again." };
  }
  if (!Array.isArray(raw)) return { error: "The parts list couldn't be read. Try again." };
  if (raw.length > 50) return { error: "Add up to 50 parts at a time." };

  const rows: (PartInput & { id?: string })[] = [];
  for (const [i, row] of raw.entries()) {
    const r = (row ?? {}) as Partial<PartRow>;
    const blank = !r.name?.trim() && !r.url?.trim() && !r.price?.trim();
    if (blank) continue;
    const parsed = partInput.safeParse({
      name: r.name ?? "",
      url: r.url ?? "",
      quantity: r.quantity ?? "",
      price: r.price ?? "",
      trackPrice: r.trackPrice ? "on" : "",
    });
    if (!parsed.success) return { error: `Part ${i + 1}: ${parsed.error.issues[0].message}` };
    rows.push({ ...parsed.data, id: typeof r.id === "string" && isUuid(r.id) ? r.id : undefined });
  }
  return { rows };
}

export function listPartsForParent(userId: string, parent: PartParent) {
  const parentFilter =
    "modId" in parent
      ? eq(parts.modId, parent.modId)
      : eq(parts.serviceRecordId, parent.serviceRecordId);
  return db
    .select()
    .from(parts)
    .where(and(eq(parts.userId, userId), parentFilter))
    .orderBy(asc(parts.createdAt));
}

// Makes the parent's parts match the form: updates rows with an id, adds new
// rows, and deletes parts that were removed. Returns tracked parts whose price
// should be checked (new ones, or ones whose link changed).
export async function syncParts(
  userId: string,
  vehicleId: string,
  parent: PartParent,
  rows: (PartInput & { id?: string })[],
) {
  const existing = await listPartsForParent(userId, parent);
  const existingIds = new Set(existing.map((p) => p.id));
  const keptIds = new Set(rows.flatMap((r) => (r.id && existingIds.has(r.id) ? [r.id] : [])));
  const toCheck: Part[] = [];

  for (const part of existing) {
    if (!keptIds.has(part.id)) await deletePart(userId, part.id);
  }
  for (const { id, ...input } of rows) {
    if (id && existingIds.has(id)) {
      const before = existing.find((p) => p.id === id)!;
      const updated = await updatePart(userId, id, input);
      if (updated?.trackPrice && (updated.url !== before.url || !updated.lastCheckedAt)) {
        toCheck.push(updated);
      }
    } else {
      const created = await createPart(userId, vehicleId, parent, input);
      if (created?.trackPrice) toCheck.push(created);
    }
  }
  return toCheck;
}

// Price checks can take a few seconds each, so run them after the response.
export function checkPricesLater(toCheck: Part[]) {
  if (toCheck.length === 0) return;
  after(async () => {
    for (const part of toCheck) await checkPartPrice(part);
  });
}

async function setParentCost(userId: string, parent: PartParent, cost: string) {
  if ("modId" in parent) {
    await db
      .update(mods)
      .set({ cost })
      .where(and(eq(mods.id, parent.modId), eq(mods.userId, userId)));
  } else {
    await db
      .update(serviceRecords)
      .set({ cost })
      .where(and(eq(serviceRecords.id, parent.serviceRecordId), eq(serviceRecords.userId, userId)));
  }
}

// Runs after a record's parts are saved. If the user left the cost blank, it
// becomes the parts total as of today (a snapshot: later price changes don't
// alter it). Tracked parts without a price are checked first so they count;
// any other price checks run after the response.
export async function settlePartsCost(
  userId: string,
  parent: PartParent,
  toCheck: Part[],
  costGiven: boolean,
) {
  if (costGiven) return checkPricesLater(toCheck);

  const unpriced = toCheck.filter((p) => p.price == null);
  for (const part of unpriced) await checkPartPrice(part);
  checkPricesLater(toCheck.filter((p) => p.price != null));

  const current = await listPartsForParent(userId, parent);
  const total = current.reduce((sum, p) => sum + (p.price ? Number(p.price) * p.quantity : 0), 0);
  if (total > 0) await setParentCost(userId, parent, total.toFixed(2));
}
