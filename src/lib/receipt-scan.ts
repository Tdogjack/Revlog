import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { receiptScans } from "@/db/schema";
import type { PartRow } from "@/lib/part-rows";
import { SERVICE_CATEGORIES, type CustomType } from "@/lib/service-categories";

// Reads a photo of a service receipt with Claude Haiku and turns it into
// values for the service form. The user always reviews them before saving.
// mod-scan.ts reuses readImage for order pages and listings.

export const DAILY_SCAN_LIMIT = 20;

const MODEL = "claude-haiku-5-5";

const receiptSchema = z.object({
  isReceipt: z.boolean(),
  servicedOn: z.string().nullable(),
  mileage: z.number().nullable(),
  total: z.number().nullable(),
  shop: z.string().nullable(),
  services: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      price: z.number().nullable(),
    }),
  ),
  notes: z.string().nullable(),
  parts: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      price: z.number().nullable(),
    }),
  ),
});

// A service on the receipt beyond the first, saved as its own record.
export type ExtraService = { category: string; title: string; cost: string };

export type ScannedReceipt = {
  values: Record<string, string>;
  parts: PartRow[];
  extras: ExtraService[];
};

export type ScanResult = { data: ScannedReceipt } | { error: string };

function prompt(customTypes: CustomType[]) {
  const types = [
    ...SERVICE_CATEGORIES.map((c) => `${c.value}: ${c.label}`),
    ...customTypes.map((t) => `${t.id}: ${t.name}`),
  ].join("\n");
  return `This image should be a receipt, invoice, or work order for car maintenance or repair. Read it and fill in the fields.

- isReceipt: false if the image is not a car service document. Leave the other fields empty then.
- servicedOn: the service date as YYYY-MM-DD, or null if none is printed.
- mileage: the odometer reading (often "Mileage In", "Odometer", or "Miles"), or null.
- total: the final amount paid including tax, as a number, or null.
- shop: the business name, or null.
- services: one entry per separate service performed, like an oil change, a tire rotation, and a brake inspection. Put the main service first: the one the parts were used for, or else the most expensive.
  - category: the key of the type that best matches that service, from this list. Use "other" if nothing fits. A check or inspection of a part (like a brake inspection) is "inspection", not that part's type, since nothing was replaced.
${types}
  - title: a short description of that service, under 60 characters, like "Full synthetic oil change".
  - price: that service's own line price before tax, as a number, or null if it has none. Do not add parts to it.
- notes: recommendations, warranty details, or the next service due, in a sentence or two. Do not repeat the services or prices. Null if none.
- parts: parts and fluids on the receipt with their quantity and unit price. Leave out labor, fees, and tax.

Only use what is printed on the document. Never guess a value.`;
}

// Counts scans in the last 24 hours and records this one, so failed scans
// still count toward the cap.
async function claimScan(userId: string) {
  const [{ used }] = await db
    .select({ used: count() })
    .from(receiptScans)
    .where(
      and(
        eq(receiptScans.userId, userId),
        gt(receiptScans.createdAt, sql`now() - interval '1 day'`),
      ),
    );
  if (used >= DAILY_SCAN_LIMIT) return false;
  await db.insert(receiptScans).values({ userId });
  return true;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

// Shared by the service and mod scanners: checks the daily cap, then asks
// Haiku to read the image into `schema`.
export async function readImage<T extends z.ZodType>(
  userId: string,
  photo: File,
  schema: T,
  instructions: string,
): Promise<{ data: z.infer<T> } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Scanning isn't set up yet." };
  const mediaType = IMAGE_TYPES.find((t) => t === photo.type);
  if (!mediaType) return { error: "That file type can't be scanned. Try a JPG or PNG photo." };
  if (!(await claimScan(userId))) {
    return { error: `You've scanned ${DAILY_SCAN_LIMIT} photos today. Try again tomorrow.` };
  }

  const data = Buffer.from(await photo.arrayBuffer()).toString("base64");
  try {
    const response = await new Anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: instructions },
          ],
        },
      ],
    });
    const parsed = response.stop_reason === "refusal" ? null : response.parsed_output;
    if (parsed == null) return { error: "That photo couldn't be read. Fill it in by hand instead." };
    return { data: parsed };
  } catch (err) {
    console.error("Scan failed", err);
    return { error: "That photo couldn't be read right now. Try again, or fill it in by hand." };
  }
}

export async function scanReceipt(
  userId: string,
  photo: File,
  customTypes: CustomType[],
): Promise<ScanResult> {
  const result = await readImage(userId, photo, receiptSchema, prompt(customTypes));
  if ("error" in result) return result;
  if (!result.data.isReceipt) {
    return { error: "That doesn't look like a service receipt. Try a clearer photo." };
  }
  return { data: toFormValues(result.data, customTypes) };
}

export const money = (n: number | null) => (n != null && n >= 0 ? n.toFixed(2) : "");

// The first service fills the form; the rest become extra records. The
// extras keep their own line prices and the first service takes the rest
// of the total (parts and tax), so the records still add up to the receipt.
function toFormValues(r: z.infer<typeof receiptSchema>, customTypes: CustomType[]): ScannedReceipt {
  const keyFor = (category: string) =>
    SERVICE_CATEGORIES.some((c) => c.value === category) ||
    customTypes.some((t) => t.id === category)
      ? category
      : "other";
  const date = r.servicedOn && /^\d{4}-\d{2}-\d{2}$/.test(r.servicedOn) ? r.servicedOn : "";
  const mileage = r.mileage != null && r.mileage > 0 ? Math.round(r.mileage).toString() : "";

  const [main, ...rest] = r.services.filter((s) => s.title.trim());
  const extras: ExtraService[] = rest.map((s) => ({
    category: keyFor(s.category),
    title: s.title.trim().slice(0, 100),
    cost: money(s.price),
  }));
  const extrasCost = extras.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
  const mainCost = r.total != null ? r.total - extrasCost : null;

  const values: Record<string, string> = {
    category: main ? keyFor(main.category) : "other",
    title: (main?.title ?? "").trim().slice(0, 100),
    servicedOn: date,
    mileage,
    cost: money(mainCost),
    shop: (r.shop ?? "").trim(),
    notes: (r.notes ?? "").trim(),
  };
  const parts: PartRow[] = r.parts
    .filter((p) => p.name.trim())
    .map((p) => ({
      name: p.name.trim().slice(0, 100),
      url: "",
      quantity: Math.max(1, Math.round(p.quantity ?? 1)).toString(),
      price: money(p.price),
      trackPrice: false,
    }));
  return { values, parts, extras };
}
