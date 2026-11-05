"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { CONFIRM_EMAIL_FIRST, isEmailVerified } from "@/lib/email-verification";
import { scanHistoryFile, scanHistoryText, type HistoryScanResult } from "@/lib/history-scan";
import { MAX_IMPORT_RECORDS } from "@/lib/history-draft";
import { parsePartRows, type PartInput } from "@/lib/parts";
import { categoryLabel, isBuiltInType } from "@/lib/service-categories";
import {
  createServiceRecords,
  serviceRecordInput,
  type ServiceRecordInput,
} from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle } from "@/lib/vehicles";

// Reads a photo or PDF into draft records. Nothing is saved here.
export async function scanHistory(formData: FormData): Promise<HistoryScanResult> {
  const user = await requireUser();
  if (!(await isEmailVerified(user.id))) return { error: CONFIRM_EMAIL_FIRST };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  return scanHistoryFile(user.id, file, await listServiceTypes(user.id));
}

// Reads a spreadsheet the column matching couldn't follow. Nothing is saved here.
export async function scanHistorySheet(text: string): Promise<HistoryScanResult> {
  const user = await requireUser();
  if (!(await isEmailVerified(user.id))) return { error: CONFIRM_EMAIL_FIRST };
  return scanHistoryText(user.id, text, await listServiceTypes(user.id));
}

const rowsSchema = z
  .array(
    z.object({
      key: z.number(),
      category: z.string(),
      title: z.string(),
      servicedOn: z.string(),
      mileage: z.string(),
      cost: z.string(),
      shop: z.string(),
      notes: z.string(),
      parts: z.array(z.unknown()).max(50),
    }),
  )
  .min(1)
  .max(MAX_IMPORT_RECORDS);

export type SaveHistoryResult =
  | { error: string; rowKey?: number }
  | { saved: { key: number; id: string }[] };

// Saves the rows the user kept: all of them or none, so a failed save can
// simply be tried again without doubling anything up.
export async function saveServiceHistory(
  vehicleId: string,
  json: string,
): Promise<SaveHistoryResult> {
  const user = await requireUser();
  const car = await getVehicle(user.id, vehicleId);
  if (!car) return { error: "That car wasn't found." };

  let raw: unknown = null;
  try {
    raw = JSON.parse(json);
  } catch {}
  const list = rowsSchema.safeParse(raw);
  if (!list.success) return { error: "The list couldn't be read. Reload the page and try again." };

  const customTypes = await listServiceTypes(user.id);
  const rows: { record: ServiceRecordInput; parts: PartInput[] }[] = [];
  for (const row of list.data) {
    const known = isBuiltInType(row.category) || customTypes.some((t) => t.id === row.category);
    const parsed = serviceRecordInput.safeParse({ ...row, category: known ? row.category : "other" });
    if (!parsed.success) return { error: parsed.error.issues[0].message, rowKey: row.key };
    const partRows = parsePartRows(JSON.stringify(row.parts));
    if ("error" in partRows) return { error: partRows.error, rowKey: row.key };
    rows.push({
      record: {
        ...parsed.data,
        title: parsed.data.title || categoryLabel(parsed.data.category, customTypes),
      },
      parts: partRows.rows,
    });
  }

  const ids = await createServiceRecords(user.id, car.id, rows);
  if (!ids) return { error: "That car wasn't found." };

  revalidatePath(`/garage/${car.id}`);
  revalidatePath("/garage");
  return { saved: list.data.map((row, i) => ({ key: row.key, id: ids[i] })) };
}
