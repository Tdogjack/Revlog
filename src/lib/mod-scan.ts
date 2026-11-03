import "server-only";
import { z } from "zod/v4";
import { MOD_CATEGORIES } from "@/lib/mod-categories";
import type { PartRow } from "@/lib/part-rows";
import { money, readImage } from "@/lib/receipt-scan";

// Reads a screenshot of an order email, order confirmation page, receipt,
// or product listing into values for the mod form.

const modSchema = z.object({
  kind: z.enum(["order", "installer", "listing", "other"]),
  part: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string(),
  date: z.string().nullable(),
  mileage: z.number().nullable(),
  total: z.number().nullable(),
  seller: z.string().nullable(),
  orderNumber: z.string().nullable(),
  url: z.string().nullable(),
  notes: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      price: z.number().nullable(),
    }),
  ),
});

export type ScannedMod = { values: Record<string, string>; parts: PartRow[] };

export type ModScanResult = { data: ScannedMod } | { error: string };

const PROMPT = `This image should show a car part purchase or a car part for sale: an order confirmation email or page, a receipt, an installer's invoice, or a product listing. Read it and fill in the fields.

- kind: "order" for an online order or store receipt, "installer" for a shop invoice where the part was installed, "listing" for a product page or ad that hasn't been bought, "other" if it isn't about a car part.
- part: what the mod is in plain words, like "Coilovers", "Cat-back exhaust", or "Cold air intake". Not the full product title.
- brand: the manufacturer, like "BC Racing" or "K&N", not the store. Null if not shown.
- category: the key that best fits, from this list.
${MOD_CATEGORIES.map((c) => `${c.value}: ${c.label}`).join("\n")}
- date: the order or invoice date as YYYY-MM-DD, or null.
- mileage: the odometer reading, only on an installer's invoice. Otherwise null.
- total: the final amount paid including shipping and tax, or the listed price for a listing. Null if not shown.
- seller: the store or shop name, or null.
- orderNumber: the order or invoice number, or null.
- url: the product page address, only if it is printed in the image (like in a browser's address bar). Otherwise null.
- notes: only part numbers and fitment, in one short sentence, like "Part # F-24-BR, fits 2015-2021 WRX." Do not repeat the items, prices, totals, shipping, delivery, store, or order number. Null if none.
- items: each product on the page with its quantity and unit price. Leave out shipping, tax, and fees.

Only use what is shown in the image. Never guess a value.`;

export async function scanModReceipt(userId: string, photo: File): Promise<ModScanResult> {
  const result = await readImage(userId, photo, modSchema, PROMPT);
  if ("error" in result) return result;
  if (result.data.kind === "other") {
    return { error: "That doesn't look like a car part order or listing. Try a clearer photo." };
  }
  return { data: toFormValues(result.data) };
}

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function toFormValues(r: z.infer<typeof modSchema>): ScannedMod {
  const installer = r.kind === "installer";
  const date = r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : "";
  const url = r.url && /^https?:\/\//.test(r.url) ? r.url : "";

  const where = [
    r.seller && `${r.kind === "listing" ? "Listed by" : "Bought from"} ${r.seller.trim()}`,
    r.orderNumber && `order ${r.orderNumber.trim()}`,
    !installer && r.kind !== "listing" && date && `on ${formatDate(date)}`,
  ]
    .filter(Boolean)
    .join(", ");
  const notes = [where && `${where}.`, r.notes?.trim()].filter(Boolean).join(" ");

  const values: Record<string, string> = {
    part: (r.part ?? "").trim().slice(0, 100),
    brand: (r.brand ?? "").trim().slice(0, 60),
    category: MOD_CATEGORIES.some((c) => c.value === r.category) ? r.category : "other",
    cost: money(r.total),
    notes,
    // A listing hasn't been bought yet. Orders keep whatever status the user picked.
    ...(r.kind === "listing" ? { status: "planned" } : {}),
    // Only an installer's date is an install date; an order date isn't.
    ...(installer && date ? { installedOn: date } : {}),
    ...(installer && r.mileage != null && r.mileage > 0
      ? { installedMileage: Math.round(r.mileage).toString() }
      : {}),
  };

  const items = r.items.filter((i) => i.name.trim());
  const parts: PartRow[] = items.map((i) => ({
    name: i.name.trim().slice(0, 100),
    // A single product with its page shown gets the link, so its price can be tracked.
    url: items.length === 1 ? url : "",
    quantity: Math.max(1, Math.round(i.quantity ?? 1)).toString(),
    price: money(i.price),
    trackPrice: items.length === 1 && !!url && r.kind === "listing",
  }));
  return { values, parts };
}
